import { type User } from '@prisma/client';
import { Router } from 'express';
import type { Prisma, Appointment as AppointmentModel } from '@prisma/client';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();

router.use(authenticate);

const defaultAppointmentInclude = {
  include: {
    customer: true,
    assignedHelper: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
};

const parseHelperFeeValue = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
};

const roundCurrency = (amount: number) => Math.round(amount * 100) / 100;

const computeHelperFeeFromConfig = (price: number, helper?: Pick<User, 'helperPayoutMode' | 'helperPayoutValue'>) => {
  if (!helper || !Number.isFinite(price)) return undefined;
  const raw =
    helper.helperPayoutMode === 'PERCENTAGE'
      ? (price * helper.helperPayoutValue) / 100
      : helper.helperPayoutValue;
  if (!Number.isFinite(raw)) return undefined;
  return Math.max(0, roundCurrency(raw));
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
const MAX_RECURRENCE_DURATION_DAYS = 365; // 1 year limit

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

  // Calculate max date (1 year from original appointment)
  const maxDate = new Date(appointment.date);
  maxDate.setDate(maxDate.getDate() + MAX_RECURRENCE_DURATION_DAYS);

  const tasks: Prisma.PrismaPromise<any>[] = [];

  for (let i = 1; i <= RECURRENCE_MAX_OCCURRENCES; i += 1) {
    const nextDate = new Date(appointment.date);
    nextDate.setDate(nextDate.getDate() + intervalDays * i);

    // Stop if we exceed 1 year limit
    if (nextDate > maxDate) {
      break;
    }

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
          owner: {
            connect: { id: appointment.userId },
          },
          customer: appointment.customerId
            ? {
              connect: { id: appointment.customerId },
            }
            : undefined,
          date: nextDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          price: appointment.price,
          status: 'NAO_CONFIRMADO', // Changed from 'AGENDADO'
          recurrenceSeriesId: appointment.recurrenceSeriesId ?? appointment.id,
          recurrenceRule: appointment.recurrenceRule,
          notes: appointment.notes,
          estimatedDurationMinutes: appointment.estimatedDurationMinutes,
          isRecurring: false,
          assignedHelper: appointment.assignedHelperId
            ? {
              connect: { id: appointment.assignedHelperId },
            }
            : undefined,
          checklistSnapshot: appointment.checklistSnapshot 
            ? (typeof appointment.checklistSnapshot === 'string' 
              ? appointment.checklistSnapshot 
              : JSON.stringify(appointment.checklistSnapshot))
            : undefined,
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

const normalizeChecklistSnapshot = (value: any): { title: string }[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((entry: any) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry.title === 'string') return entry.title.trim();
      return '';
    })
    .filter((title: string) => title.length > 0)
    .map((title: string) => ({ title }));
};

const ensureHelperOwnership = async (helperId: string | null | undefined, ownerId: string) => {
  if (!helperId) return null;

  // Allow self-assignment
  if (helperId === ownerId) {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        name: true,
        helperPayoutMode: true,
        helperPayoutValue: true,
      },
    });
    if (!user) throw new Error('HELPER_NOT_FOUND');
    return user;
  }

  const helper = await prisma.user.findFirst({
    where: { id: helperId, companyId: ownerId },
    select: {
      id: true,
      name: true,
      helperPayoutMode: true,
      helperPayoutValue: true,
    },
  });
  if (!helper) {
    throw new Error('HELPER_NOT_FOUND');
  }
  return helper;
};

const syncChecklistItems = async (
  appointmentId: string,
  snapshot?: { title?: string | null }[],
) => {
  if (!snapshot || snapshot.length === 0) return;

  await prisma.appointmentChecklistItem.deleteMany({ where: { appointmentId } });

  const toCreate = snapshot
    .map((item, index) => ({
      title: item.title?.trim(),
      sortOrder: index,
    }))
    .filter((item) => item.title && item.title.length > 0) as { title: string; sortOrder: number }[];

  if (!toCreate.length) return;

  await prisma.$transaction(
    toCreate.map((item) =>
      prisma.appointmentChecklistItem.create({
        data: {
          appointmentId,
          title: item.title,
          sortOrder: item.sortOrder,
        },
      }),
    ),
  );
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
      ...defaultAppointmentInclude,
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
      ...defaultAppointmentInclude,
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

    const now = new Date();
    const range = buildUtcDayRange(startDate as string);
    if (!range) {
      return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
    }

    const start = range.start;
    const end = new Date(range.start);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    const pendingToAutoFinish = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: start,
          lte: end,
        },
        status: { in: ['AGENDADO', 'EM_ANDAMENTO'] },
        OR: [
          {
            date: { lt: new Date(now.setHours(0, 0, 0, 0)) },
          },
          {
            date: { equals: new Date(now.setHours(0, 0, 0, 0)) },
            endTime: { lt: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
          }
        ]
      },
    });

    if (pendingToAutoFinish.length > 0) {
      for (const apt of pendingToAutoFinish) {
        // Marca como concluído
        await prisma.appointment.update({
          where: { id: apt.id },
          data: {
            status: 'CONCLUIDO',
            finishedAt: new Date()
          }
        });
        // Lança receita
        await ensureRevenueTransaction(apt.id, req.user!.id, apt.price, apt.date);
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      ...defaultAppointmentInclude,
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
      ...defaultAppointmentInclude,
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
      include: {
        customer: true,
        transactions: true,
        assignedHelper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
      helperFee,
      status,
      isRecurring,
      recurrenceRule,
      notes,
      estimatedDurationMinutes,
      assignedHelperId,
      checklistSnapshot,
    } = req.body;

    const userId = req.user!.id;

    let helperRecord: Awaited<ReturnType<typeof ensureHelperOwnership>> = null;

    try {
      await ensureCustomerOwnership(customerId, userId);
      helperRecord = await ensureHelperOwnership(assignedHelperId, userId);
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }
      if (error.message === 'HELPER_NOT_FOUND') {
        return res.status(404).json({ error: 'Helper não encontrada na sua equipe.' });
      }
      throw error;
    }

    const appointmentDate = buildDateAtUtcNoon(date);
    if (!appointmentDate) {
      return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
    }

    const recurrenceSeriesId = isRecurring ? randomBytes(8).toString('hex') : null;

    const normalizedChecklist = normalizeChecklistSnapshot(checklistSnapshot);

    const parsedPrice = parseFloat(price);
    let helperFeeValue = parseHelperFeeValue(helperFee);
    if (helperFeeValue === undefined && helperRecord) {
      helperFeeValue = computeHelperFeeFromConfig(parsedPrice, helperRecord);
    }

    const appointment = await prisma.appointment.create({
      data: {
        owner: {
          connect: { id: userId },
        },
        customer: customerId
          ? {
            connect: { id: customerId },
          }
          : undefined,
        date: appointmentDate,
        startTime,
        endTime,
        price: parsedPrice,
        helperFee: helperFeeValue,
        status: status || 'EM_ANDAMENTO',
        isRecurring: isRecurring ?? false,
        recurrenceRule,
        recurrenceSeriesId,
        notes,
        estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes, 10) : null,
        assignedHelper: assignedHelperId
          ? {
            connect: { id: assignedHelperId },
          }
          : undefined,
        checklistSnapshot: normalizedChecklist ? JSON.stringify(normalizedChecklist) : undefined,
      },
      ...defaultAppointmentInclude,
    });

    if (normalizedChecklist?.length) {
      await syncChecklistItems(appointment.id, normalizedChecklist);
    }

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
      helperFee,
      status,
      isRecurring,
      recurrenceRule,
      notes,
      estimatedDurationMinutes,
      assignedHelperId,
      checklistSnapshot,
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

    const appointmentId = req.params.id;
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    let nextDate: Date | undefined;
    if (date) {
      const built = buildDateAtUtcNoon(date);
      if (!built) {
        return res.status(400).json({ error: 'Data inválida. Use o formato yyyy-mm-dd.' });
      }
      nextDate = built;
    }

    const normalizedChecklistUpdate = normalizeChecklistSnapshot(checklistSnapshot);

    const nextHelperId =
      assignedHelperId !== undefined ? (assignedHelperId || null) : existing.assignedHelperId;
    let helperRecord: Awaited<ReturnType<typeof ensureHelperOwnership>> = null;
    if (nextHelperId) {
      try {
        helperRecord = await ensureHelperOwnership(nextHelperId, req.user!.id);
      } catch (error: any) {
        if (error.message === 'HELPER_NOT_FOUND') {
          return res.status(404).json({ error: 'Helper não encontrada na sua equipe.' });
        }
        throw error;
      }
    }

    const priceForCalc = price !== undefined ? parseFloat(price) : existing.price;
    let helperFeeValue =
      helperFee === undefined ? undefined : parseHelperFeeValue(helperFee) ?? 0;

    if (helperFee === undefined && helperRecord) {
      helperFeeValue = computeHelperFeeFromConfig(priceForCalc, helperRecord);
    }

    const updateData: Prisma.AppointmentUpdateInput = {
      customer: customerId
        ? {
          connect: { id: customerId },
        }
        : undefined,
      date: nextDate ?? undefined,
      startTime: startTime ?? undefined,
      endTime: endTime ?? undefined,
      price: price !== undefined ? priceForCalc : undefined,
      status: status ?? undefined,
      isRecurring: isRecurring ?? undefined,
      recurrenceRule: recurrenceRule ?? undefined,
      notes: notes ?? undefined,
      estimatedDurationMinutes:
        estimatedDurationMinutes !== undefined
          ? parseInt(estimatedDurationMinutes, 10)
          : undefined,
      checklistSnapshot: normalizedChecklistUpdate ? JSON.stringify(normalizedChecklistUpdate) : undefined,
    };

    if (assignedHelperId !== undefined) {
      updateData.assignedHelper = nextHelperId
        ? {
          connect: { id: nextHelperId },
        }
        : { disconnect: true };
    }

    if (helperFeeValue !== undefined) {
      updateData.helperFee = helperFeeValue;
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      ...defaultAppointmentInclude,
    });

    if (normalizedChecklistUpdate) {
      await syncChecklistItems(appointmentId, normalizedChecklistUpdate);
    }

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

      // Generate next occurrence if this is part of a recurring series
      if (updated.recurrenceSeriesId && updated.recurrenceRule) {
        const intervalDays = getRecurrenceIntervalDays(updated.recurrenceRule);
        if (intervalDays) {
          // Find all future appointments in this series
          const futureAppointments = await prisma.appointment.findMany({
            where: {
              recurrenceSeriesId: updated.recurrenceSeriesId,
              userId: updated.userId,
              date: { gt: updated.date },
            },
            orderBy: { date: 'desc' },
          });

          // If we have less than 4 future occurrences, generate the next one
          if (futureAppointments.length < RECURRENCE_MAX_OCCURRENCES) {
            const lastDate = futureAppointments.length > 0
              ? new Date(futureAppointments[0].date)
              : new Date(updated.date);

            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + intervalDays);

            // Check 1-year limit from original appointment
            const maxDate = new Date(updated.date);
            maxDate.setDate(maxDate.getDate() + MAX_RECURRENCE_DURATION_DAYS);

            if (nextDate <= maxDate) {
              const { start, end } = getDayRange(nextDate);

              // Check if appointment already exists
              const exists = await prisma.appointment.count({
                where: {
                  userId: updated.userId,
                  customerId: updated.customerId,
                  date: { gte: start, lte: end },
                  startTime: updated.startTime,
                },
              });

              if (exists === 0) {
                await prisma.appointment.create({
                  data: {
                    owner: { connect: { id: updated.userId } },
                    customer: { connect: { id: updated.customerId } },
                    date: nextDate,
                    startTime: updated.startTime,
                    endTime: updated.endTime,
                    price: updated.price,
                    status: 'NAO_CONFIRMADO',
                    recurrenceSeriesId: updated.recurrenceSeriesId,
                    recurrenceRule: updated.recurrenceRule,
                    notes: updated.notes,
                    estimatedDurationMinutes: updated.estimatedDurationMinutes,
                    isRecurring: false,
                    assignedHelper: updated.assignedHelperId
                      ? { connect: { id: updated.assignedHelperId } }
                      : undefined,
                    checklistSnapshot: updated.checklistSnapshot 
                      ? (typeof updated.checklistSnapshot === 'string' 
                        ? updated.checklistSnapshot 
                        : JSON.stringify(updated.checklistSnapshot))
                      : undefined,
                  },
                });
              }
            }
          }
        }
      }
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

router.delete('/:id/series', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const baseWhere: Prisma.AppointmentWhereInput = {
      userId: req.user!.id,
    };

    let where: Prisma.AppointmentWhereInput | null = null;

    if (appointment.recurrenceSeriesId) {
      where = { ...baseWhere, recurrenceSeriesId: appointment.recurrenceSeriesId };
    } else if (appointment.recurrenceRule) {
      where = {
        ...baseWhere,
        customerId: appointment.customerId,
        startTime: appointment.startTime,
        recurrenceRule: appointment.recurrenceRule,
      };
    } else {
      where = {
        ...baseWhere,
        customerId: appointment.customerId,
        startTime: appointment.startTime,
      };

      if (appointment.price !== undefined && appointment.price !== null) {
        where.price = appointment.price;
      }
      if (appointment.notes) {
        where.notes = appointment.notes;
      }
      if (appointment.isRecurring !== undefined) {
        where.isRecurring = appointment.isRecurring;
      }
    }

    const result = await prisma.appointment.deleteMany({ where });

    if (result.count === 0) {
      await prisma.appointment.deleteMany({
        where: { id: appointment.id, userId: req.user!.id },
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover série recorrente.' });
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
