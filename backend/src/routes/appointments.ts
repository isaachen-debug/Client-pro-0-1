import { Router } from 'express';
import type { Prisma, Appointment as AppointmentModel } from '@prisma/client';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();

router.use(authenticate);

const withCustomer = {
  include: { customer: true },
};

const parseYmdParts = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  if ([year, monthIndex, day].some((part) => Number.isNaN(part) || !Number.isFinite(part))) {
    return null;
  }
  return { year, monthIndex, day };
};

const buildDateAtUtcNoon = (value: string) => {
  const parts = parseYmdParts(value);
  if (!parts) return null;
  const { year, monthIndex, day } = parts;
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
};

const buildUtcDayRange = (value: string) => {
  const parts = parseYmdParts(value);
  if (!parts) return null;
  const { year, monthIndex, day } = parts;
  const start = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
  return { start, end };
};

const RECURRENCE_MAX_OCCURRENCES = 4;

const getRecurrenceIntervalDays = (rule?: string | null) => {
  if (!rule) return null;
  const normalized = rule.toUpperCase();
  if (normalized.includes('FREQ=WEEKLY') && normalized.includes('INTERVAL=2')) {
    return 14;
  }
  if (normalized.includes('FREQ=WEEKLY')) {
    return 7;
  }
  return null;
};

const getDayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const scheduleRecurringAppointments = async (appointment: AppointmentModel) => {
  if (!appointment.isRecurring) return;

  const intervalDays = getRecurrenceIntervalDays(appointment.recurrenceRule);
  if (!intervalDays) return;

  const tasks: Prisma.PrismaPromise<any>[] = [];

  for (let i = 1; i <= RECURRENCE_MAX_OCCURRENCES; i += 1) {
    const nextDate = new Date(appointment.date);
    nextDate.setDate(nextDate.getDate() + intervalDays * i);
    const { start, end } = getDayRange(nextDate);

    const exists = await prisma.appointment.count({
      where: {
        userId: appointment.userId,
        customerId: appointment.customerId,
        date: { gte: start, lte: end },
        startTime: appointment.startTime,
      },
    });

    if (exists > 0) {
      continue;
    }

    tasks.push(
      prisma.appointment.create({
        data: {
          userId: appointment.userId,
          customerId: appointment.customerId,
          date: nextDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          price: appointment.price,
          status: 'AGENDADO',
          notes: appointment.notes,
          estimatedDurationMinutes: appointment.estimatedDurationMinutes,
          isRecurring: false,
          recurrenceRule: null,
        },
      }),
    );
  }

  if (tasks.length) {
    await prisma.$transaction(tasks);
  }
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
    const where: any = {
      userId: req.user!.id,
    };

    if (customerId && typeof customerId === 'string' && customerId.trim() !== '') {
      where.customerId = customerId.trim();
    }

    if (status && typeof status === 'string' && status.trim() !== '') {
      where.status = status.trim();
    }

    if (date && typeof date === 'string') {
      const range = buildUtcDayRange(date);
      if (!range) {
        return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
      }
      where.date = {
        gte: range.start,
        lte: range.end,
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

    const range = buildUtcDayRange(startDate as string);
    if (!range) {
      return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
    }

    const start = range.start;
    const end = new Date(range.start);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

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

    const appointmentDate = buildDateAtUtcNoon(date);
    if (!appointmentDate) {
      return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        customerId,
        date: appointmentDate,
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

    await scheduleRecurringAppointments(appointment);

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

    let nextDate: Date | undefined;
    if (date) {
      const built = buildDateAtUtcNoon(date);
      if (!built) {
        return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
      }
      nextDate = built;
    }

    const updated = await prisma.appointment.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: {
        customerId,
        date: nextDate,
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

