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

    // --- Helper for Month Ranges ---
    const getMonthRange = (date: Date) => {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    };

    const currentMonth = getMonthRange(new Date(year, month - 1));
    const previousMonth = getMonthRange(new Date(year, month - 2));

    // --- 1. Finance & Active Clients ---
    // Revenue Current Month
    const revenueTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'RECEITA',
        dueDate: { gte: currentMonth.start, lte: currentMonth.end },
      },
      include: { appointment: true }, // Needed for ticket calculation
    });

    const totalRevenueMonth = revenueTransactions
      .filter((item) => item.status === 'PAGO')
      .reduce((sum, item) => sum + item.amount, 0);

    const pendingPaymentsMonth = revenueTransactions
      .filter((item) => item.status === 'PENDENTE')
      .reduce((sum, item) => sum + item.amount, 0);

    // Average Ticket (Current Month)
    const paidServicesCount = revenueTransactions.filter(t => t.status === 'PAGO' && t.appointmentId).length;
    const averageTicket = paidServicesCount > 0 ? totalRevenueMonth / paidServicesCount : 0;

    // --- Comparisons (Previous Month) ---
    const prevRevenueTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'RECEITA',
        dueDate: { gte: previousMonth.start, lte: previousMonth.end },
        status: 'PAGO'
      }
    });

    // 2. Client Metrics (Active & New)
    const activeClientsCount = await prisma.customer.count({
      where: { userId, status: 'ACTIVE' }
    });

    // For "Active Clients previous month" logic is tricky without history table, 
    // but we can estimate or use New Clients count as a proxy for growth.
    // Let's use New Clients count for precision.
    const newClientsCurrent = await prisma.customer.count({
      where: {
        userId,
        createdAt: { gte: currentMonth.start, lte: currentMonth.end }
      }
    });

    const newClientsPrev = await prisma.customer.count({
      where: {
        userId,
        createdAt: { gte: previousMonth.start, lte: previousMonth.end }
      }
    });

    // 3. Jobs & Cancellations
    const jobsCurrent = await prisma.appointment.count({
      where: { userId, date: { gte: currentMonth.start, lte: currentMonth.end }, status: 'CONCLUIDO' }
    });

    const jobsPrev = await prisma.appointment.count({
      where: { userId, date: { gte: previousMonth.start, lte: previousMonth.end }, status: 'CONCLUIDO' }
    });

    const cancelsCurrent = await prisma.appointment.count({
      where: { userId, date: { gte: currentMonth.start, lte: currentMonth.end }, status: 'CANCELADO' }
    });

    const cancelsPrev = await prisma.appointment.count({
      where: { userId, date: { gte: previousMonth.start, lte: previousMonth.end }, status: 'CANCELADO' }
    });

    // Average Ticket Prev
    const prevRevenueTotal = prevRevenueTransactions.reduce((acc, t) => acc + t.amount, 0);
    const prevPaidCount = prevRevenueTransactions.filter(t => t.appointmentId).length;
    const averageTicketPrev = prevPaidCount > 0 ? prevRevenueTotal / prevPaidCount : 0;

    // --- Helper for Comparison Object ---
    const calcComparison = (current: number, previous: number, label: string = 'mês anterior') => {
      let percent = 0;
      if (previous > 0) {
        percent = ((current - previous) / previous) * 100;
      } else if (current > 0) {
        percent = 100;
      }
      return { value: previous, percent: Number(percent.toFixed(1)), label };
    };

    // --- 4. Chart Data (Revenue vs Expense by Day of Week for current view) ---
    // If month view, maybe aggregate by week? The current UI expects day names (Seg/Ter...).
    // Let's aggregate by day for the current week if "This Month" is selected? 
    // Or actually, the mock data was daily per week. Let's stick to "Current Week" for the chart to keep it detailed.
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const weekRevenue = await prisma.transaction.findMany({
      where: { userId, type: 'RECEITA', status: 'PAGO', dueDate: { gte: weekStart, lte: weekEnd } }
    });
    const weekExpense = await prisma.helperExpense.findMany({
      where: { ownerId: userId, date: { gte: weekStart, lte: weekEnd } }
    });

    const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const chartData = daysMap.map((dayLabel, idx) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + idx);

      // Match day
      const income = weekRevenue
        .filter(t => new Date(t.dueDate).getDate() === dayDate.getDate())
        .reduce((s, t) => s + t.amount, 0);

      // Expenses logic is simplified here as schema has 'amount' on helperExpense
      const expense = weekExpense
        .filter(e => new Date(e.date).getDate() === dayDate.getDate())
        .reduce((s, e) => s + e.amount, 0);

      return {
        label: dayLabel,
        value: income, // For legacy support if needed
        income,
        expense,
        balance: income - expense
      };
    });


    // --- 5. Activity Feed (Aggregated) ---
    // Fetch recent 10 items from different sources and sort
    const recentContracts = await prisma.contract.findMany({
      where: { ownerId: userId, status: 'ACEITO' },
      include: { client: true },
      orderBy: { updatedAt: 'desc' },
      take: 3
    });

    const recentPayments = await prisma.transaction.findMany({
      where: { userId, type: 'RECEITA', status: 'PAGO' },
      include: { appointment: { include: { customer: true } } },
      orderBy: { paidAt: 'desc' },
      take: 3
    });

    const recentJobs = await prisma.appointment.findMany({
      where: { userId, status: 'CONCLUIDO' },
      include: { customer: true, assignedHelper: true },
      orderBy: { finishedAt: 'desc' },
      take: 3
    });

    // Merge & Map
    const activityFeed: any[] = [];

    recentContracts.forEach(c => {
      activityFeed.push({
        id: `contract-${c.id}`,
        type: 'contract',
        title: `${c.client?.name || 'Cliente'} assinou contrato`,
        description: c.title,
        time: c.updatedAt, // Raw date locally, format in frontend
        user: c.client?.name
      });
    });

    recentPayments.forEach(t => {
      activityFeed.push({
        id: `payment-${t.id}`,
        type: 'payment',
        title: 'Pagamento recebido',
        description: t.description || `Serviço - ${t.appointment?.customer?.name || 'Cliente'}`,
        time: t.paidAt || t.createdAt,
        amount: t.amount,
      });
    });

    recentJobs.forEach(j => {
      activityFeed.push({
        id: `job-${j.id}`,
        type: 'job_completed',
        title: 'Serviço concluído',
        description: `${j.customer.name} - ${j.assignedHelper?.name || 'Equipe'}`,
        time: j.finishedAt || j.date,
        user: j.assignedHelper?.name
      });
    });

    // Sort by time desc
    activityFeed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());


    // --- 6. Lists (Existing logic kept or slightly optimized) ---
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        userId,
        date: { gte: new Date() },
        status: { not: 'CANCELADO' },
      },
      include: { customer: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 5,
    });

    const recentCompletedAppointmentsRaw = await prisma.appointment.findMany({
      where: {
        userId,
        status: 'CONCLUIDO',
        date: { lte: new Date() },
      },
      include: {
        customer: true,
        transactions: { where: { type: 'RECEITA' } },
      },
      orderBy: [{ finishedAt: 'desc' }, { date: 'desc' }],
      take: 5,
    });

    const recentCompletedAppointments = recentCompletedAppointmentsRaw.map((appointment) => {
      const transaction = appointment.transactions[0];
      return {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        price: appointment.price,
        customer: { id: appointment.customer.id, name: appointment.customer.name },
        transactionStatus: (transaction?.status ?? 'PENDENTE') as 'PENDENTE' | 'PAGO',
        transactionId: transaction?.id ?? null,
      };
    });

    res.json({
      totalRevenueMonth,
      pendingPaymentsMonth,

      activeClientsCount,
      activeClientsComparison: calcComparison(activeClientsCount, activeClientsCount - (newClientsCurrent - newClientsPrev), 'vs mês anterior'), // rough proxy

      newClientsCount: newClientsCurrent,
      newClientsComparison: calcComparison(newClientsCurrent, newClientsPrev),

      scheduledServicesCount: jobsCurrent,
      scheduledServicesComparison: calcComparison(jobsCurrent, jobsPrev),

      cancellationsCount: cancelsCurrent,
      cancellationsComparison: calcComparison(cancelsCurrent, cancelsPrev),

      averageTicket: Number(averageTicket.toFixed(2)),
      averageTicketComparison: calcComparison(averageTicket, averageTicketPrev),

      revenueByWeek: chartData, // mapped to day comparison
      upcomingAppointments,
      recentCompletedAppointments,
      activityFeed: activityFeed.slice(0, 10) // Limit to 10
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar métricas.' });
  }
});

export default router;

