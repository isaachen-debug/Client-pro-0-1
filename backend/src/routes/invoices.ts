import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        customer: true,
        transactions: true,
        owner: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    const transaction =
      appointment.transactions.length > 0 ? appointment.transactions[0] : null;

    res.json({
      id: appointment.id,
      invoiceNumber: appointment.invoiceNumber ?? `INV-${appointment.id.slice(0, 8).toUpperCase()}`,
      invoiceToken: appointment.invoiceToken,
      status: transaction?.status ?? (appointment.status === 'CONCLUIDO' ? 'PAGO' : 'PENDENTE'),
      price: appointment.price,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      estimatedDurationMinutes: appointment.estimatedDurationMinutes,
      serviceType: appointment.customer.serviceType,
      customer: appointment.customer,
      transaction,
      notes: appointment.notes,
      company: {
        name: appointment.owner.name,
        email: appointment.owner.email,
        companyName: appointment.owner.companyName,
        primaryColor: appointment.owner.primaryColor,
        avatarUrl: appointment.owner.avatarUrl,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao recuperar fatura.' });
  }
});

export default router;

