import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { stringify } from 'csv-stringify/sync';

const router = Router();

router.use(authenticate);

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const ensureAppointmentOwnership = async (appointmentId: string, userId: string) => {
  if (!appointmentId) return;
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, userId },
  });
  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }
};

router.get('/', async (req, res) => {
  try {
    const { from, to, status, type } = req.query;
    const userId = req.user!.id;

    const fromDate = from ? startOfDay(new Date(from as string)) : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const toDate = to ? endOfDay(new Date(to as string)) : endOfDay(new Date());

    const where: any = {
      userId,
      dueDate: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        appointment: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar transações.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      appointmentId,
      type,
      status,
      amount,
      dueDate,
      paidAt,
      description,
    } = req.body;

    if (appointmentId) {
      try {
        await ensureAppointmentOwnership(appointmentId, req.user!.id);
      } catch (error: any) {
        if (error.message === 'APPOINTMENT_NOT_FOUND') {
          return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }
        throw error;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user!.id,
        appointmentId,
        type,
        status,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        paidAt: paidAt ? new Date(paidAt) : null,
        description: description ? String(description) : null,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar transação.' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const deleted = await prisma.transaction.deleteMany({
      where: { userId: req.user!.id },
    });
    res.json({ success: true, deleted: deleted.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao limpar transações.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      appointmentId,
      type,
      status,
      amount,
      dueDate,
      paidAt,
      description,
    } = req.body;

    if (appointmentId) {
      try {
        await ensureAppointmentOwnership(appointmentId, req.user!.id);
      } catch (error: any) {
        if (error.message === 'APPOINTMENT_NOT_FOUND') {
          return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }
        throw error;
      }
    }

    const updated = await prisma.transaction.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: {
        appointmentId,
        type,
        status,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        paidAt: paidAt ? new Date(paidAt) : null,
        description: description !== undefined ? (description ? String(description) : null) : undefined,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        appointment: { include: { customer: true } },
      },
    });

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar transação.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await prisma.transaction.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    res.json({ message: 'Transação removida.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover transação.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'PAGO' && status !== 'PENDENTE') {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const updated = await prisma.transaction.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: {
        status,
        paidAt: status === 'PAGO' ? new Date() : null,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        appointment: {
          include: { customer: true },
        },
      },
    });

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar transação.' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { from, to } = req.query;
    const userId = req.user!.id;

    const fromDate = from ? startOfDay(new Date(from as string)) : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const toDate = to ? endOfDay(new Date(to as string)) : endOfDay(new Date());

    const data = await prisma.transaction.findMany({
      where: {
        userId,
        dueDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        appointment: {
          include: { customer: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const records = data.map((transaction) => ({
      Data: transaction.dueDate.toISOString().split('T')[0],
      Tipo: transaction.type,
      Status: transaction.status,
      Cliente: transaction.appointment?.customer?.name ?? '-',
      Descricao: transaction.description ?? '-',
      Serviço: transaction.appointment?.customer?.serviceType ?? '-',
      Valor: transaction.amount,
      PagoEm: transaction.paidAt ? transaction.paidAt.toISOString() : '-',
    }));

    const csv = stringify(records, { header: true, delimiter: ';' });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=transacoes.csv');
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao exportar CSV.' });
  }
});

export default router;
