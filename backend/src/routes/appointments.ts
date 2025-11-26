import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();

router.use(authenticate);

const withCustomer = {
  include: { customer: true },
};

const ensureCustomerOwnership = async (customerId: string, userId: string) => {
  if (!customerId) return;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });
  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }
};

router.get('/', async (req, res) => {
  try {
    const { date, customerId, status } = req.query;
    const where: Prisma.AppointmentWhereInput = {
      userId: req.user!.id,
    };

    if (customerId && typeof customerId === 'string' && customerId.trim() !== '') {
      where.customerId = customerId.trim();
    }

    if (status && typeof status === 'string' && status.trim() !== '') {
      where.status = status.trim();
    }

    if (date && typeof date === 'string') {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
      }
      parsedDate.setHours(0, 0, 0, 0);
      const end = new Date(parsedDate);
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: parsedDate,
        lte: end,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      ...withCustomer,
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar agendamentos.' });
  }
});

router.get('/month', async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {
      return res.status(400).json({ error: 'Informe year e month.' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      ...withCustomer,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar agendamentos do mês.' });
  }
});

router.get('/week', async (req, res) => {
  try {
    const { startDate } = req.query;
    if (!startDate) {
      return res.status(400).json({ error: 'Informe startDate (yyyy-mm-dd).' });
    }

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      ...withCustomer,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar agendamentos da semana.' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: today, lte: end },
      },
      include: { customer: true },
      orderBy: [{ startTime: 'asc' }],
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar serviços de hoje.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { customer: true, transactions: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      customerId,
      date,
      startTime,
      endTime,
      price,
      status,
      isRecurring,
      recurrenceRule,
      notes,
      estimatedDurationMinutes,
    } = req.body;

    const userId = req.user!.id;

    try {
      await ensureCustomerOwnership(customerId, userId);
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }
      throw error;
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        customerId,
        date: new Date(date),
        startTime,
        endTime,
        price: parseFloat(price),
        status: status || 'AGENDADO',
        isRecurring: isRecurring ?? false,
        recurrenceRule,
        notes,
        estimatedDurationMinutes: estimatedDurationMinutes
          ? parseInt(estimatedDurationMinutes, 10)
          : null,
      },
      include: { customer: true },
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar agendamento.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      customerId,
      date,
      startTime,
      endTime,
      price,
      status,
      isRecurring,
      recurrenceRule,
      notes,
      estimatedDurationMinutes,
    } = req.body;

    if (customerId) {
      try {
        await ensureCustomerOwnership(customerId, req.user!.id);
      } catch (error: any) {
        if (error.message === 'CUSTOMER_NOT_FOUND') {
          return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        throw error;
      }
    }

    const updated = await prisma.appointment.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: {
        customerId,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        price: price !== undefined ? parseFloat(price) : undefined,
        status,
        isRecurring,
        recurrenceRule,
        notes,
        estimatedDurationMinutes:
          estimatedDurationMinutes !== undefined
            ? parseInt(estimatedDurationMinutes, 10)
            : undefined,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { customer: true },
    });

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, sendInvoice } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const data: any = {
      status,
      startedAt:
        status === 'EM_ANDAMENTO' && !appointment.startedAt
          ? new Date()
          : appointment.startedAt,
      finishedAt:
        status === 'CONCLUIDO' && !appointment.finishedAt
          ? new Date()
          : appointment.finishedAt,
    };

    if (status === 'CONCLUIDO') {
      if (!appointment.invoiceToken) {
        data.invoiceToken = randomBytes(16).toString('hex');
      }
      if (!appointment.invoiceNumber) {
        data.invoiceNumber = `INV-${appointment.id.slice(0, 8).toUpperCase()}`;
      }
      if (sendInvoice) {
        data.invoiceSentAt = new Date();
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data,
      include: { customer: true },
    });

    if (status === 'CONCLUIDO') {
      await ensureRevenueTransaction(updated.id, req.user!.id, updated.price, updated.date);
    } else if (status === 'CANCELADO') {
      // Remove transações pendentes relacionadas ao serviço cancelado
      await prisma.transaction.deleteMany({
        where: {
          appointmentId: updated.id,
          status: 'PENDENTE',
        },
      });
    }

    const response: any = updated;
    if (sendInvoice) {
      response.invoiceUrl = `${process.env.APP_URL ?? 'http://localhost:5174'}/invoice/${updated.id}`;
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

router.patch('/:id/start', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'EM_ANDAMENTO',
        startedAt: appointment.startedAt ?? new Date(),
      },
      include: { customer: true },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao iniciar serviço.' });
  }
});

router.patch('/:id/finish', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CONCLUIDO',
        startedAt: appointment.startedAt ?? new Date(),
        finishedAt: appointment.finishedAt ?? new Date(),
      },
      include: { customer: true },
    });

    await ensureRevenueTransaction(appointment.id, req.user!.id, appointment.price, appointment.date);

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao finalizar serviço.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await prisma.appointment.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    res.json({ message: 'Agendamento removido.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover agendamento.' });
  }
});

const ensureRevenueTransaction = async (
  appointmentId: string,
  userId: string,
  amount: number,
  dueDate: Date,
) => {
  await prisma.transaction.upsert({
    where: {
      appointmentId_type: {
        appointmentId,
        type: 'RECEITA',
      },
    },
    create: {
      userId,
      appointmentId,
      type: 'RECEITA',
      status: 'PENDENTE',
      amount,
      dueDate,
    },
    update: {
      amount,
      dueDate,
    },
  });
};

export default router;

