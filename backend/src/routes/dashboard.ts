import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { endOfWeek, startOfWeek } from 'date-fns';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const buildWeekRanges = (start: Date, end: Date) => {
  const ranges: Array<{ label: string; start: Date; end: Date }> = [];
  let cursor = new Date(start);
  let index = 1;

  while (cursor <= end) {
    const weekStart = new Date(cursor);
    let weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > end) {
      weekEnd = new Date(end);
    }

    ranges.push({
      label: `Semana ${index}`,
      start: weekStart,
      end: weekEnd,
    });

    cursor.setDate(cursor.getDate() + 7);
    index += 1;
  }

  return ranges;
};

const DEBUG_LOG_PATH = '/Users/isaachenrik/projeto code/.cursor/debug.log';

const appendDebugLog = (payload: Record<string, any>) => {
  try {
    const dir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify(payload) + '\n');
  } catch {
    // ignore logging errors
  }
};

router.get('/overview', async (req, res) => {
  try {
    // #region agent log
    appendDebugLog({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'backend/src/routes/dashboard.ts:entry',
      message: 'Dashboard overview hit',
      data: { userId: req.user?.id ?? null },
      timestamp: Date.now(),
    });
    // #endregion

    const userId = req.user!.id;
    const today = new Date();
    const month = req.query.month ? Number(req.query.month) : today.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : today.getFullYear();

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return res.status(400).json({ error: 'Parâmetros de mês ou ano inválidos.' });
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const revenueTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'RECEITA',
        dueDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const totalRevenueMonth = revenueTransactions
      .filter((item) => item.status === 'PAGO')
      .reduce((sum, item) => sum + item.amount, 0);
    const pendingPaymentsMonth = revenueTransactions
      .filter((item) => item.status === 'PENDENTE')
      .reduce((sum, item) => sum + item.amount, 0);

    const activeClientsCount = await prisma.customer.count({
      where: { userId, status: 'ACTIVE' },
    });

    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const scheduledServicesCount = await prisma.appointment.count({
      where: {
        userId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: {
          not: 'CANCELADO',
        },
      },
    });

    const weekRanges = buildWeekRanges(monthStart, monthEnd);
    const revenueByWeek = weekRanges.map((range) => {
      const value = revenueTransactions
        .filter(
          (transaction) =>
            transaction.status === 'PAGO' &&
            transaction.dueDate >= range.start &&
            transaction.dueDate <= range.end,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      return { label: range.label, value };
    });

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        userId,
        date: {
          gte: new Date(),
        },
        status: {
          not: 'CANCELADO',
        },
      },
      include: {
        customer: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 5,
    });

    // #region agent log
    appendDebugLog({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'backend/src/routes/dashboard.ts:upcomingAppointments',
      message: 'Upcoming appointments payload',
      data: {
        total: upcomingAppointments.length,
        missingCustomer: upcomingAppointments.filter((appointment) => !appointment.customer).length,
      },
      timestamp: Date.now(),
    });
    // #endregion

    const recentCompletedAppointmentsRaw = await prisma.appointment.findMany({
      where: {
        userId,
        status: 'CONCLUIDO',
        date: {
          lte: new Date(),
        },
      },
      include: {
        customer: true,
        transactions: {
          where: {
            type: 'RECEITA',
          },
        },
      },
      orderBy: [{ finishedAt: 'desc' }, { date: 'desc' }],
      take: 5,
    });

    // #region agent log
    appendDebugLog({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'backend/src/routes/dashboard.ts:recentCompletedAppointments',
      message: 'Recent completed payload',
      data: {
        total: recentCompletedAppointmentsRaw.length,
        withTransaction: recentCompletedAppointmentsRaw.filter(
          (item) => (item.transactions?.[0]?.id ?? null) !== null,
        ).length,
      },
      timestamp: Date.now(),
    });
    // #endregion

    const recentCompletedAppointments = recentCompletedAppointmentsRaw.map((appointment) => {
      const transaction = appointment.transactions[0];
      return {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        price: appointment.price,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name,
        },
        transactionStatus: (transaction?.status ?? 'PENDENTE') as 'PENDENTE' | 'PAGO',
        transactionId: transaction?.id ?? null,
      };
    });

    res.json({
      totalRevenueMonth,
      pendingPaymentsMonth,
      activeClientsCount,
      scheduledServicesCount,
      revenueByWeek,
      upcomingAppointments,
      recentCompletedAppointments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar métricas.' });
  }
});

export default router;

