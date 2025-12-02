import { Role, ContractStatus } from '@prisma/client';
import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { generateContractPdf, getContractFileName } from '../utils/contractPdf';

const router = Router();

router.use(authenticate);

const ensureClient = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.role !== Role.CLIENT) {
    throw new Error('FORBIDDEN');
  }
  return user;
};

router.get('/home', async (req, res) => {
  try {
    const client = await ensureClient(req.user!.id);

    const customers = await prisma.customer.findMany({
      where: {
        email: client.email,
      },
    });

    if (!customers.length) {
      return res.json({
        customer: null,
        upcoming: [],
        history: [],
      });
    }

    const customerIds = customers.map((customer) => customer.id);
    const ownerId = customers[0].userId;
    const preferencesPayload =
      customers[0].clientPreferences ?? {
        focusAreas: [],
        fragrance: 'Cítrico',
        notes: '',
      };

    const now = new Date();

    const [owner, upcomingAppointments, historyAppointments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ownerId },
        select: {
          id: true,
          name: true,
          companyName: true,
          avatarUrl: true,
          email: true,
          contactPhone: true,
          whatsappNumber: true,
          reviewLinks: true,
          companyWebsite: true,
          companyShowcase: true,
        },
      }),
      prisma.appointment.findMany({
        where: {
          customerId: { in: customerIds },
          date: { gte: now },
        },
        include: {
          customer: true,
          assignedHelper: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 5,
      }),
      prisma.appointment.findMany({
        where: {
          customerId: { in: customerIds },
          date: { lt: now },
        },
        include: {
          customer: true,
          assignedHelper: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
        take: 10,
      }),
    ]);

    const formatAppointment = (appointment: any) => ({
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      serviceType: appointment.customer?.serviceType,
      helperName: appointment.assignedHelper?.name ?? null,
      notes: appointment.notes,
      price: appointment.price,
    });

    res.json({
      customer: {
        name: client.name,
        email: client.email,
        serviceType: customers[0].serviceType,
        companyName: owner?.companyName,
        ownerName: owner?.name,
        companyWebsite: owner?.companyWebsite,
        avatarUrl: owner?.avatarUrl,
        contactEmail: owner?.email,
        contactPhone: owner?.contactPhone,
        whatsappNumber: owner?.whatsappNumber,
        preferences: preferencesPayload,
        reviewLinks: owner?.reviewLinks ?? null,
        companyShowcase: owner?.companyShowcase ?? null,
      },
      upcoming: upcomingAppointments.map(formatAppointment),
      history: historyAppointments.map(formatAppointment),
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito ao portal do cliente.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar informações do cliente.' });
  }
});

router.get('/contracts', async (req, res) => {
  try {
    const client = await ensureClient(req.user!.id);
    const contracts = await prisma.contract.findMany({
      where: { clientId: client.id },
      orderBy: [{ createdAt: 'desc' }],
      include: {
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
      },
    });
    res.json(contracts);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito ao portal do cliente.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar contratos.' });
  }
});

router.get('/contracts/:id/pdf', async (req, res) => {
  try {
    const client = await ensureClient(req.user!.id);
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, clientId: client.id },
      include: {
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
      },
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
      return res.status(403).json({ error: 'Acesso restrito ao portal do cliente.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar PDF do contrato.' });
  }
});

router.post('/contracts/:id/accept', async (req, res) => {
  try {
    const client = await ensureClient(req.user!.id);
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, clientId: client.id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado.' });
    }

    if (contract.status === ContractStatus.ACEITO) {
      return res.status(400).json({ error: 'Contrato já foi aceito.' });
    }

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: ContractStatus.ACEITO,
        acceptedAt: new Date(),
        clientNotes: req.body?.clientNotes,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito ao portal do cliente.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao aceitar contrato.' });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const client = await ensureClient(req.user!.id);

    const customers = await prisma.customer.findMany({
      where: {
        email: client.email,
      },
    });

    if (!customers.length) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const preferences = req.body?.preferences ?? {};

    const updated = await prisma.customer.update({
      where: { id: customers[0].id },
      data: {
        clientPreferences: preferences,
      },
    });

    res.json({
      preferences: updated.clientPreferences ?? {},
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito ao portal do cliente.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao salvar preferências.' });
  }
});

export default router;

