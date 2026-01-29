import type { User } from '@prisma/client';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import prisma from '../db';
import { authenticate, generateToken } from '../middleware/auth';
import {
  fetchHelperAppointmentsForDay,
  mapHelperAppointment,
  summarizeHelperAppointments,
} from '../services/helperDay';
import { generateContractPdf, getContractFileName } from '../utils/contractPdf';

const router = Router();

router.use(authenticate);

const CONTRACT_INCLUDE = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      contactPhone: true,
      whatsappNumber: true,
    },
  },
  client: { select: { id: true, name: true, email: true, contactPhone: true } },
};

const CLIENT_CONTRACT_SELECT = {
  id: true,
  name: true,
  email: true,
  companyId: true,
  role: true,
} as const;

const ensureOwner = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.role !== 'OWNER') {
    throw new Error('FORBIDDEN');
  }
  return user;
};

const findOwnerAppointment = async (ownerId: string, appointmentId: string) => {
  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      userId: ownerId,
    },
    include: {
      checklistItems: { orderBy: { sortOrder: 'asc' } },
    },
  });
};

const ensureContractClient = async (
  owner: Awaited<ReturnType<typeof ensureOwner>>,
  params: { clientId?: string; customerId?: string },
) => {
  if (params.clientId) {
    const directClient = await prisma.user.findFirst({
      where: { id: params.clientId, companyId: owner.id, role: 'CLIENT' },
      select: CLIENT_CONTRACT_SELECT,
    });
    if (!directClient) {
      throw new Error('CLIENT_NOT_FOUND');
    }
    return { client: directClient, temporaryPassword: null as string | null };
  }

  if (!params.customerId) {
    throw new Error('CUSTOMER_REQUIRED');
  }

  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, userId: owner.id },
  });

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  if (!customer.email) {
    throw new Error('CUSTOMER_EMAIL_REQUIRED');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: customer.email },
    select: CLIENT_CONTRACT_SELECT,
  });

  if (existingUser) {
    if (existingUser.companyId !== owner.id || existingUser.role !== 'CLIENT') {
      throw new Error('EMAIL_IN_USE');
    }
    return { client: existingUser, temporaryPassword: null };
  }

  const temporaryPassword = randomBytes(4).toString('hex');
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const client = await prisma.user.create({
    data: {
      name: customer.name || 'Cliente',
      email: customer.email,
      passwordHash,
      role: 'CLIENT',
      companyId: owner.id,
      planStatus: owner.planStatus,
      trialStart: owner.trialStart,
      trialEnd: owner.trialEnd,
      isActive: false,
    },
    select: CLIENT_CONTRACT_SELECT,
  });

  return { client, temporaryPassword };
};

const ensureHelperForOwner = async (ownerId: string, helperId: string) => {
  // Case 1: Self-assignment (Owner assigning to themselves)
  if (helperId === ownerId) {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        name: true,
        email: true,
        helperPayoutMode: true,
        helperPayoutValue: true,
      },
    });
    if (!user) throw new Error('HELPER_NOT_FOUND');
    return user;
  }

  // Case 2: Subordinate assignment (Helper belongs to owner's company)
  const helper = await prisma.user.findFirst({
    where: {
      id: helperId,
      companyId: ownerId
    },
    select: {
      id: true,
      name: true,
      email: true,
      helperPayoutMode: true,
      helperPayoutValue: true,
    },
  });
  if (!helper) {
    throw new Error('HELPER_NOT_FOUND');
  }
  return helper;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const computeHelperPayout = (
  price: number,
  helper: { helperPayoutMode: string; helperPayoutValue: number },
) => {
  if (!Number.isFinite(price)) return 0;
  const base =
    helper.helperPayoutMode === 'PERCENTAGE'
      ? (price * helper.helperPayoutValue) / 100
      : helper.helperPayoutValue;
  return Math.max(0, roundCurrency(base));
};

router.get('/', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);

    const members = await prisma.user.findMany({
      where: {
        OR: [{ id: owner.id }, { companyId: owner.id }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        whatsappNumber: true,
        contactPhone: true,
        helperPayoutMode: true,
        helperPayoutValue: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    res.json({
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
      },
      members,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar equipe.' });
  }
});

router.post('/helpers/:helperId/calculate-fee', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const helper = await ensureHelperForOwner(owner.id, req.params.helperId);
    const { price } = req.body as { price?: number };

    if (!price || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'Informe um preço válido.' });
    }

    const calculatedFee = computeHelperPayout(price, helper);
    const explanation =
      helper.helperPayoutMode === 'PERCENTAGE'
        ? `${helper.helperPayoutValue}% de $${price.toFixed(2)}`
        : `Valor fixo`;

    res.json({
      helperFee: calculatedFee,
      explanation,
      helper: {
        id: helper.id,
        name: helper.name,
        payoutMode: helper.helperPayoutMode,
        payoutValue: helper.helperPayoutValue,
      },
    });
  } catch (error: any) {
    console.log('Error in calculate-fee:', error.message);
    if (error.message === 'HELPER_NOT_FOUND') {
      console.log('Helpers debug info:', {
        reqHelperId: req.params.helperId,
        reqUserId: req.user!.id
      });
    }

    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    if (error.message === 'HELPER_NOT_FOUND') {
      return res.status(404).json({ error: 'Helper não encontrada.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao calcular pagamento da helper.' });
  }
});

router.get('/clients/contracts', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const contracts = await prisma.contract.findMany({
      where: { ownerId: owner.id },
      orderBy: [{ createdAt: 'desc' }],
      include: CONTRACT_INCLUDE,
    });
    res.json(contracts);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar contratos.' });
  }
});

router.get('/clients/contracts/:id/pdf', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, ownerId: owner.id },
      include: CONTRACT_INCLUDE,
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado.' });
    }

    const buffer = await generateContractPdf(contract);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${getContractFileName(contract.title)}`);
    return res.send(buffer);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar PDF do contrato.' });
  }
});

router.post('/clients/contracts', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { clientId, customerId, title, body, pdfUrl, placeholders, gallery } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Informe título e conteúdo do contrato.' });
    }

    const { client, temporaryPassword } = await ensureContractClient(owner, { clientId, customerId });

    const contract = await prisma.contract.create({
      data: {
        ownerId: owner.id,
        clientId: client.id,
        title,
        body,
        pdfUrl,
        placeholders,
        gallery,
        status: 'PENDENTE',
      },
      include: CONTRACT_INCLUDE,
    });

    // TODO: enviar email/notification

    res.status(201).json({
      ...contract,
      meta: temporaryPassword
        ? {
          provisionalAccess: {
            email: client.email,
            temporaryPassword,
          },
        }
        : undefined,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Cliente do portal não encontrado.' });
    }
    if (error.message === 'CUSTOMER_REQUIRED') {
      return res
        .status(400)
        .json({ error: 'Selecione um cliente do cadastro ou informe o cliente do portal.' });
    }
    if (error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'Cadastro do cliente não foi localizado.' });
    }
    if (error.message === 'CUSTOMER_EMAIL_REQUIRED') {
      return res
        .status(400)
        .json({ error: 'Adicione um email ao cadastro para gerar contratos enviados por mensagem ou portal.' });
    }
    if (error.message === 'EMAIL_IN_USE') {
      return res
        .status(400)
        .json({ error: 'O email deste cliente pertence a outra conta. Use um email diferente.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar contrato.' });
  }
});

router.patch('/clients/contracts/:id/status', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { status, ownerNotes } = req.body as { status: string; ownerNotes?: string };

    if (!['PENDENTE', 'ACEITO', 'RECUSADO'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, ownerId: owner.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado.' });
    }

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status,
        ownerNotes,
        acceptedAt: status === 'ACEITO' ? new Date() : contract.acceptedAt,
      },
      include: CONTRACT_INCLUDE,
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar contrato.' });
  }
});

router.post('/helpers', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Informe nome, email e senha inicial.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ error: 'Já existe um usuário com este email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const helper = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'HELPER',
        companyId: owner.id,
        planStatus: owner.planStatus,
        trialStart: owner.trialStart,
        trialEnd: owner.trialEnd,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      helper,
      message: 'Helper criada com sucesso. Compartilhe o login com ela.',
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem criar helpers.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar helper.' });
  }
});

router.post('/clients/:customerId/portal-user', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { email, name, password } = req.body as { email?: string; name?: string; password?: string };

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Informe um email válido para o cliente.' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, userId: owner.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const displayName = name?.trim() || customer.name || 'Cliente';
    const providedPassword =
      password && typeof password === 'string' && password.length >= 6 ? password : null;
    const generatedPassword = providedPassword ?? randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    let portalUser;

    if (existingUser) {
      if (existingUser.companyId !== owner.id || existingUser.role !== 'CLIENT') {
        return res.status(400).json({ error: 'Este email já está em uso em outra conta.' });
      }

      portalUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: displayName,
          passwordHash,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    } else {
      portalUser = await prisma.user.create({
        data: {
          name: displayName,
          email,
          passwordHash,
          role: 'CLIENT',
          companyId: owner.id,
          planStatus: owner.planStatus,
          trialStart: owner.trialStart,
          trialEnd: owner.trialEnd,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { email },
    });

    return res.status(201).json({ user: portalUser, temporaryPassword: generatedPassword });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem criar acessos para clientes.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar acesso do cliente.' });
  }
});


router.get('/helpers/status', async (req, res) => {
  try {
    await ensureOwner(req.user!.id);

    const { date } = req.query;
    const targetDateParam = typeof date === 'string' ? new Date(date) : new Date();
    const targetDate = new Date(targetDateParam);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const helpers = await prisma.user.findMany({
      where: {
        companyId: req.user!.id,
        role: 'HELPER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    if (!helpers.length) {
      return res.json({ date: targetDate.toISOString(), helpers: [] });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        assignedHelperId: { in: helpers.map((helper) => helper.id) },
        date: { gte: targetDate, lte: endDate },
      },
      include: {
        customer: true,
        checklistItems: true,
      },
      orderBy: [{ startTime: 'asc' }],
    });

    const helpersStatus = helpers.map((helper) => {
      const helperAppointments = appointments.filter((appointment) => appointment.assignedHelperId === helper.id);
      const activeAppointment =
        helperAppointments.find((appointment) => appointment.status === 'EM_ANDAMENTO') ??
        helperAppointments.find((appointment) => appointment.status === 'AGENDADO') ??
        null;

      const checklist = activeAppointment
        ? {
          total: activeAppointment.checklistItems.length,
          completed: activeAppointment.checklistItems.filter((item) => item.completedAt).length,
        }
        : null;

      const summary = helperAppointments.reduce(
        (acc, appointment) => {
          acc.total += 1;
          if (appointment.status === 'CONCLUIDO') acc.completed += 1;
          else if (appointment.status === 'EM_ANDAMENTO') acc.inProgress += 1;
          else acc.pending += 1;
          return acc;
        },
        { total: 0, completed: 0, pending: 0, inProgress: 0 },
      );

      return {
        helper,
        activeAppointment: activeAppointment
          ? {
            id: activeAppointment.id,
            startTime: activeAppointment.startTime,
            endTime: activeAppointment.endTime,
            status: activeAppointment.status,
            customer: {
              id: activeAppointment.customer.id,
              name: activeAppointment.customer.name,
              address: activeAppointment.customer.address,
            },
            checklist,
            startedAt: activeAppointment.startedAt,
            finishedAt: activeAppointment.finishedAt,
          }
          : null,
        summary,
      };
    });

    res.json({
      date: targetDate.toISOString(),
      helpers: helpersStatus,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem acessar esta rota.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar status das helpers.' });
  }
});

router.get('/helpers/:helperId/day', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const helper = await prisma.user.findFirst({
      where: {
        id: req.params.helperId,
        companyId: owner.id,
        role: 'HELPER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        whatsappNumber: true,
        contactPhone: true,
      },
    });

    if (!helper) {
      return res.status(404).json({ error: 'Helper não encontrada na sua equipe.' });
    }

    const targetDateParam = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date();
    const targetDate = new Date(targetDateParam);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await fetchHelperAppointmentsForDay(helper.id, targetDate, endDate);
    const summary = summarizeHelperAppointments(appointments);

    res.json({
      helper,
      date: targetDate.toISOString(),
      summary,
      appointments: appointments.map(mapHelperAppointment),
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem acessar esta rota.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar dados da helper.' });
  }
});

router.put('/helpers/:helperId/payout', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const helper = await ensureHelperForOwner(owner.id, req.params.helperId);
    const { mode, value } = req.body as { mode?: string; value?: number };

    if (!mode || !['FIXED', 'PERCENTAGE'].includes(mode)) {
      return res.status(400).json({ error: 'Escolha FIXED ou PERCENTAGE.' });
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return res.status(400).json({ error: 'Informe um valor válido maior ou igual a zero.' });
    }

    const normalizedValue =
      mode === 'PERCENTAGE' ? Math.min(100, roundCurrency(parsedValue)) : roundCurrency(parsedValue);

    const updated = await prisma.user.update({
      where: { id: helper.id },
      data: {
        helperPayoutMode: mode,
        helperPayoutValue: normalizedValue,
      },
      select: {
        id: true,
        name: true,
        helperPayoutMode: true,
        helperPayoutValue: true,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar este dado.' });
    }
    if (error.message === 'HELPER_NOT_FOUND') {
      return res.status(404).json({ error: 'Helper não encontrada.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao salvar configuração.' });
  }
});

router.post('/helpers/:helperId/expenses', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const helper = await ensureHelperForOwner(owner.id, req.params.helperId);
    const { category, amount, notes, date } = req.body as {
      category?: string;
      amount?: number;
      notes?: string;
      date?: string;
    };

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Informe a categoria (ex: Gasolina, Pedágio, Bônus).' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Informe um valor maior que zero.' });
    }

    const expenseDate = date ? new Date(date) : new Date();
    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({ error: 'Data inválida.' });
    }

    const expense = await prisma.helperExpense.create({
      data: {
        helperId: helper.id,
        ownerId: owner.id,
        category: category.trim(),
        amount: roundCurrency(parsedAmount),
        notes: notes?.trim(),
        date: expenseDate,
      },
    });

    res.status(201).json(expense);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem adicionar despesas.' });
    }
    if (error.message === 'HELPER_NOT_FOUND') {
      return res.status(404).json({ error: 'Helper não encontrada.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar despesa.' });
  }
});

router.delete('/helpers/:helperId/expenses/:expenseId', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const helper = await ensureHelperForOwner(owner.id, req.params.helperId);

    const deleted = await prisma.helperExpense.deleteMany({
      where: {
        id: req.params.expenseId,
        helperId: helper.id,
        ownerId: owner.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem remover despesas.' });
    }
    if (error.message === 'HELPER_NOT_FOUND') {
      return res.status(404).json({ error: 'Helper não encontrada.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao remover despesa.' });
  }
});

router.get('/helpers/:helperId/costs', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const helper = await ensureHelperForOwner(owner.id, req.params.helperId);
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : new Date();
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : null;

    if (Number.isNaN(from.getTime())) {
      return res.status(400).json({ error: 'Parâmetro "from" inválido.' });
    }

    const rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : new Date(rangeStart);
    rangeEnd.setHours(23, 59, 59, 999);
    if (!to) {
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        assignedHelperId: helper.id,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        price: true,
        helperFee: true,
        status: true,
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    let revenueTotal = 0;
    let payoutTotal = 0;
    const appointmentSummaries = appointments.map((appointment) => {
      revenueTotal += appointment.price;
      const effectiveFee =
        appointment.helperFee ?? computeHelperPayout(appointment.price, helper);
      payoutTotal += effectiveFee;
      return {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        price: appointment.price,
        status: appointment.status,
        helperFee: appointment.helperFee,
        projectedFee: effectiveFee,
        customer: appointment.customer,
      };
    });

    const expenses = await prisma.helperExpense.findMany({
      where: {
        helperId: helper.id,
        ownerId: owner.id,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { date: 'desc' },
    });

    const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    res.json({
      helper: {
        id: helper.id,
        name: helper.name,
        helperPayoutMode: helper.helperPayoutMode,
        helperPayoutValue: helper.helperPayoutValue,
      },
      range: {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      },
      summary: {
        appointments: appointmentSummaries.length,
        revenueTotal,
        payoutTotal: roundCurrency(payoutTotal),
        margin: roundCurrency(revenueTotal - payoutTotal),
        expensesTotal: roundCurrency(expensesTotal),
        netAfterExpenses: roundCurrency(revenueTotal - payoutTotal - expensesTotal),
      },
      appointments: appointmentSummaries,
      expenses: {
        total: roundCurrency(expensesTotal),
        items: expenses,
      },
      inspiration: [
        'Use o modo percentual para helpers que recebem % da limpeza.',
        'Registre gasolina, estacionamento ou pedágio para saber o custo real da rota.',
        'Anote bônus extras ou gorjetas para não esquecer no fechamento do mês.',
      ],
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Apenas administradores podem acessar custos.' });
    }
    if (error.message === 'HELPER_NOT_FOUND') {
      return res.status(404).json({ error: 'Helper não encontrada.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar custos.' });
  }
});

router.post('/appointments/:appointmentId/checklist', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { appointmentId } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Informe o título do item de checklist.' });
    }

    const appointment = await findOwnerAppointment(owner.id, appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const nextOrder =
      appointment.checklistItems.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), -1) + 1;

    await prisma.appointmentChecklistItem.create({
      data: {
        appointmentId: appointment.id,
        title: title.trim(),
        sortOrder: nextOrder,
      },
    });

    const checklist = await prisma.appointmentChecklistItem.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { sortOrder: 'asc' },
    });

    res.status(201).json(checklist);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao adicionar item ao checklist.' });
  }
});

router.delete('/appointments/:appointmentId/checklist/:taskId', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { appointmentId, taskId } = req.params;

    const appointment = await findOwnerAppointment(owner.id, appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const existing = await prisma.appointmentChecklistItem.findFirst({
      where: { id: taskId, appointmentId: appointment.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    await prisma.appointmentChecklistItem.delete({
      where: { id: taskId },
    });

    const checklist = await prisma.appointmentChecklistItem.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(checklist);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao remover item do checklist.' });
  }
});

router.post('/appointments/:appointmentId/checklist/:taskId/toggle', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { appointmentId, taskId } = req.params;

    const appointment = await findOwnerAppointment(owner.id, appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const task = await prisma.appointmentChecklistItem.findFirst({
      where: { id: taskId, appointmentId: appointment.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    await prisma.appointmentChecklistItem.update({
      where: { id: task.id },
      data: {
        completedAt: task.completedAt ? null : new Date(),
        completedById: task.completedAt ? null : owner.id,
      },
    });

    const checklist = await prisma.appointmentChecklistItem.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(checklist);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar checklist.' });
  }
});

router.patch('/appointments/:appointmentId/notes', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { appointmentId } = req.params;
    const { notes } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId: owner.id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        notes: typeof notes === 'string' ? notes : null,
      },
      include: {
        customer: true,
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        photos: true,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar observações.' });
  }
});

router.post('/customers/:customerId/portal-link', async (req, res) => {
  try {
    const owner = await ensureOwner(req.user!.id);
    const { customerId } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: owner.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (!customer.email) {
      return res.status(400).json({ error: 'Cliente precisa ter um email cadastrado.' });
    }

    // Find or create user for this customer
    let user = await prisma.user.findUnique({
      where: { email: customer.email },
    });

    if (user) {
      // Security check
      if (user.companyId !== owner.id || user.role !== 'CLIENT') {
        return res.status(400).json({ error: 'Este email já está associado a outra conta.' });
      }
    } else {
      // Create new client user
      const passwordHash = await bcrypt.hash(randomBytes(8).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          name: customer.name,
          email: customer.email,
          passwordHash,
          role: 'CLIENT',
          companyId: owner.id,
          planStatus: owner.planStatus,
          isActive: true, // Auto-activate for magic link
        },
      });
    }

    const token = generateToken(user.id); // Import this from middleware/auth

    // Construct link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const link = `${baseUrl}/portal/${token}`;

    res.json({
      success: true,
      link,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
      },
    });

  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito.' });
    }
    console.error('Error generating portal link:', error);
    res.status(500).json({ error: 'Erro ao gerar link de acesso.' });
  }
});

export default router;


