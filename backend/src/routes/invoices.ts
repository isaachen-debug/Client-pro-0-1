import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();

// Authenticated routes
router.get('/:id', authenticate, async (req, res) => {
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

/**
 * POST /api/invoices/:id/confirm-payment
 * Owner confirms customer payment (AUTH REQUIRED)
 */
router.post('/:id/confirm-payment', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed } = req.body;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: req.user!.id },
      include: {
        appointment: {
          include: { customer: true },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (confirmed) {
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'PAGO',
          paidAt: new Date(),
          // Preserve the paymentMethod that customer selected
          // It's already set from the mark-paid endpoint
        },
        include: {
          appointment: {
            include: { customer: true },
          },
        },
      });

      // TODO: Send thank you SMS to customer
      res.json({
        message: 'Payment confirmed',
        transaction: updated,
      });
    } else {
      // Owner denied the payment
      await prisma.transaction.update({
        where: { id },
        data: {
          customerMarkedPaid: false,
          customerPaidAt: null,
          confirmationNotes: null,
        },
      });

      res.json({
        message: 'Payment denied. Customer will be notified.',
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

/**
 * POST /api/invoices/:id/generate
 * Generate invoice token for a transaction if it doesn't exist (AUTH REQUIRED)
 */
router.post('/:id/generate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the appointment first
    const appointment = await prisma.appointment.findFirst({
      where: { id, userId: req.user!.id },
      include: {
        transactions: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    let transaction = appointment.transactions.length > 0 ? appointment.transactions[0] : null;

    if (!transaction) {
      // If no transaction exists (shouldn't happen for completed appointments usually, but let's handle it)
      // We can create one or error out. For now let's assume one exists or we return error.
      // Actually, better to error out if no transaction found linked to this appointment context
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    // If already has token, just return it
    if (transaction.invoiceToken) {
      return res.json({
        message: 'Invoice already exists',
        invoiceToken: transaction.invoiceToken,
        transaction,
      });
    }

    // Generate new token
    const invoiceToken = generateInvoiceToken();

    // Update transaction
    const updated = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        invoiceToken,
      },
    });

    // Also update appointment for consistency if needed, but schema has both. 
    // Let's keep them in sync if appointment also has the field
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        invoiceToken,
      },
    });

    res.json({
      message: 'Invoice generated successfully',
      invoiceToken,
      transaction: updated,
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// PUBLIC routes (no authentication)

/**
 * GET /api/invoices/public/:token
 * Get invoice details by token (PUBLIC - no auth required)
 */
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { invoiceToken: token },
      include: {
        appointment: {
          include: {
            customer: true,
          },
        },
        user: {
          select: {
            companyName: true,
            businessLogo: true,
            zelleEmail: true,
            venmoUsername: true,
            cashAppUsername: true,
            stripeConnected: true,
            enabledPaymentMethods: true,
            paymentInstructions: true,
            id: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Parse enabled payment methods
    let enabledMethods: string[] = [];
    if (transaction.user.enabledPaymentMethods) {
      try {
        enabledMethods = JSON.parse(transaction.user.enabledPaymentMethods);
      } catch (e) {
        console.error('Error parsing enabledPaymentMethods:', e);
      }
    }

    // Build payment methods object
    const paymentMethods: any = {};

    if (enabledMethods.includes('ZELLE') && transaction.user.zelleEmail) {
      paymentMethods.zelle = { email: transaction.user.zelleEmail };
    }

    if (enabledMethods.includes('VENMO') && transaction.user.venmoUsername) {
      paymentMethods.venmo = { username: transaction.user.venmoUsername };
    }

    if (enabledMethods.includes('CASH_APP') && transaction.user.cashAppUsername) {
      paymentMethods.cashApp = { username: transaction.user.cashAppUsername };
    }

    if (enabledMethods.includes('STRIPE') && transaction.user.stripeConnected) {
      paymentMethods.stripe = { enabled: true };
    }

    if (enabledMethods.includes('CASH')) {
      paymentMethods.cash = {
        instructions: transaction.user.paymentInstructions || 'Pay in cash when service is complete',
      };
    }

    // Fetch latest accepted contract for checklist
    let includedServices: string[] = [];
    if (transaction.appointment?.customer) {
      // 1. Try to find an accepted contract first (Specific)
      const contract = await prisma.contract.findFirst({
        where: {
          clientId: transaction.appointment.customer.id,
          status: 'ACEITO'
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (contract && contract.placeholders) {
        try {
          const ph = JSON.parse(contract.placeholders);
          const bp = ph.blueprint;
          if (bp && bp.services) {
            const std = Object.keys(bp.services.standard || {}).filter(k => bp.services.standard[k]);
            const deep = Object.keys(bp.services.deep || {}).filter(k => bp.services.deep[k]);
            const custom = bp.services.custom || [];

            // Simple mapping for labels (could be improved with shared consts)
            const labels: Record<string, string> = {
              dusting: 'Dusting', vacuuming: 'Vacuuming', mopping: 'Mopping',
              kitchenExterior: 'Kitchen exterior', bathroom: 'Bathroom', trash: 'Trash',
              baseboards: 'Baseboards', insideFridge: 'Inside fridge', insideOven: 'Inside oven',
              windows: 'Windows', highDusting: 'High dusting'
            };

            includedServices = [
              ...std.map(k => labels[k] || k),
              ...deep.map(k => labels[k] || k),
              ...custom
            ];
          }
        } catch (e) {
          console.error('Error parsing contract blueprint', e);
        }
      }
      // 2. If no contract, check Service Tag (Fallback)
      else if (transaction.appointment.customer.serviceType) {
        const matchingPackage = await prisma.servicePackage.findFirst({
          where: {
            ownerId: transaction.user.id,
            name: {
              equals: transaction.appointment.customer.serviceType,
            },
            isActive: true
          }
        });

        if (matchingPackage) {
          try {
            includedServices = JSON.parse(matchingPackage.items);
          } catch (e) {
            console.error('Error parsing package items', e);
          }
        }
      }
    }

    res.json({
      invoice: {
        id: transaction.id,
        amount: transaction.amount,
        dueDate: transaction.dueDate,
        status: transaction.status,
        paidAt: transaction.paidAt,
        paymentMethod: transaction.paymentMethod,
        customerMarkedPaid: transaction.customerMarkedPaid,
        customerPaidAt: transaction.customerPaidAt,
        createdAt: transaction.createdAt,
      },
      customer: transaction.appointment?.customer
        ? {
          name: transaction.appointment.customer.name,
          address: transaction.appointment.customer.address,
          serviceType: transaction.appointment.customer.serviceType,
        }
        : null,
      appointment: transaction.appointment
        ? {
          date: transaction.appointment.date,
          startTime: transaction.appointment.startTime,
          endTime: transaction.appointment.endTime,
          notes: transaction.appointment.notes,
        }
        : null,
      owner: {
        businessName: transaction.user.companyName || 'Business',
        businessLogo: transaction.user.businessLogo,
        paymentMethods,
      },
      includedServices,
    });
  } catch (error) {
    console.error('Error fetching public invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/**
 * POST /api/invoices/public/:token/mark-paid
 * Customer marks invoice as paid (PUBLIC - no auth required)
 */
router.post('/public/:token/mark-paid', async (req, res) => {
  try {
    const { token } = req.params;
    const { paymentMethod, notes } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { invoiceToken: token },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (transaction.status === 'PAGO') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    const validMethods = ['ZELLE', 'VENMO', 'CASH_APP', 'CASH'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const updated = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        customerMarkedPaid: true,
        customerPaidAt: new Date(),
        paymentMethod,
        confirmationNotes: notes || null,
      },
    });

    // TODO: Send notification to owner

    res.json({
      message: 'Payment confirmation received. Waiting for owner confirmation.',
      transaction: {
        id: updated.id,
        customerMarkedPaid: updated.customerMarkedPaid,
        paymentMethod: updated.paymentMethod,
      },
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

/**
 * Helper function to generate invoice token
 */
export const generateInvoiceToken = (): string => {
  return randomBytes(32).toString('hex');
};

export default router;
