import { Router } from 'express';
import prisma from '../db';
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

router.get('/overview', async (req, res) => {
  try {
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

    const scheduledServicesCount = await prisma.appointment.count({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
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

    res.json({
      totalRevenueMonth,
      pendingPaymentsMonth,
      activeClientsCount,
      scheduledServicesCount,
      revenueByWeek,
      upcomingAppointments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar métricas.' });
  }
});

export default router;

