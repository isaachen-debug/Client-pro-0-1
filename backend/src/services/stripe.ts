import Stripe from 'stripe';
import prisma from '../db';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Stripe payment features disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

export interface CreatePaymentLinkParams {
  transactionId: string;
  amount: number;
  description: string;
  customerName: string;
  customerEmail?: string;
  appointmentId?: string;
}

export interface PaymentLinkResult {
  paymentLink: string;
  paymentLinkId: string;
}

/**
 * Creates a Stripe payment link for a transaction
 */
export const createPaymentLink = async (
  params: CreatePaymentLinkParams
): Promise<PaymentLinkResult> => {
  if (!stripe) {
    throw new Error('Stripe not configured. Add STRIPE_SECRET_KEY to environment.');
  }

  const { transactionId, amount, description, customerName, customerEmail, appointmentId } = params;

  // Convert amount to cents (Stripe uses smallest currency unit)
  const amountCents = Math.round(amount * 100);

  // Create a Stripe product for this service
  const product = await stripe.products.create({
    name: `Service - ${customerName}`,
    description: description,
    metadata: {
      transactionId,
      appointmentId: appointmentId || '',
    },
  });

  // Create a price for the product
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: amountCents,
  });

  // Create a payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      },
    },
    metadata: {
      transactionId,
      appointmentId: appointmentId || '',
      customerEmail: customerEmail || '',
    },
    // Enable multiple payment methods
    payment_method_types: ['card', 'us_bank_account', 'cashapp'],
  });

  // Update transaction with payment link
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      paymentLink: paymentLink.url,
      paymentLinkId: paymentLink.id,
    },
  });

  return {
    paymentLink: paymentLink.url,
    paymentLinkId: paymentLink.id,
  };
};

/**
 * Handle Stripe webhook events
 */
export const handleWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  console.log(`🔔 Stripe webhook received: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get transaction ID from metadata
      const transactionId = session.metadata?.transactionId;
      
      if (!transactionId) {
        console.warn('❌ No transactionId in session metadata');
        return;
      }

      // Check if transaction exists and is not already paid
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { appointment: { include: { customer: true } } },
      });

      if (!transaction) {
        console.warn(`❌ Transaction ${transactionId} not found`);
        return;
      }

      if (transaction.status === 'PAGO') {
        console.log(`✅ Transaction ${transactionId} already paid`);
        return;
      }

      // Determine payment method
      let paymentMethod = 'CARD';
      if (session.payment_method_types?.includes('us_bank_account')) {
        paymentMethod = 'ACH';
      } else if (session.payment_method_types?.includes('cashapp')) {
        paymentMethod = 'CASH_APP';
      }

      // Update transaction status
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'PAGO',
          paidAt: new Date(),
          paymentMethod,
          stripeSessionId: session.id,
          paymentMetadata: JSON.stringify({
            paymentIntent: session.payment_intent,
            amountTotal: session.amount_total,
            currency: session.currency,
          }),
        },
      });

      console.log(`✅ Transaction ${transactionId} marked as PAGO`);

      // TODO: Send SMS notification to customer
      // const customer = transaction.appointment?.customer;
      // if (customer?.phone) {
      //   await sendSMS(customer.phone, 'Payment confirmed! Thank you.');
      // }

      break;
    }

    case 'payment_intent.succeeded': {
      console.log('💰 Payment intent succeeded');
      break;
    }

    case 'payment_intent.payment_failed': {
      console.log('❌ Payment intent failed');
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
};

/**
 * Verify Stripe webhook signature
 */
export const constructWebhookEvent = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};

export default stripe;
