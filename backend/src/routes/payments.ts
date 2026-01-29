import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/payments/settings
 * Get current user's payment settings
 */
router.get('/settings', async (req, res) => {
    try {
        const userId = req.user!.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                zelleEmail: true,
                venmoUsername: true,
                cashAppUsername: true,
                stripeAccountId: true,
                stripeConnected: true,
                enabledPaymentMethods: true,
                businessLogo: true,
                paymentInstructions: true,
                companyName: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse enabled payment methods
        let enabledMethods: string[] = [];
        if (user.enabledPaymentMethods) {
            try {
                enabledMethods = JSON.parse(user.enabledPaymentMethods);
            } catch (e) {
                console.error('Error parsing enabledPaymentMethods:', e);
            }
        }

        res.json({
            ...user,
            enabledPaymentMethods: enabledMethods,
        });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({ error: 'Failed to fetch payment settings' });
    }
});

/**
 * PUT /api/payments/settings
 * Update payment settings
 */
router.put('/settings', async (req, res) => {
    try {
        const userId = req.user!.id;
        const {
            zelleEmail,
            venmoUsername,
            cashAppUsername,
            enabledPaymentMethods,
            businessLogo,
            paymentInstructions,
        } = req.body;

        // Validate enabled payment methods
        if (enabledPaymentMethods && !Array.isArray(enabledPaymentMethods)) {
            return res.status(400).json({ error: 'enabledPaymentMethods must be an array' });
        }

        const validMethods = ['ZELLE', 'VENMO', 'CASH_APP', 'STRIPE', 'CASH'];
        if (enabledPaymentMethods) {
            for (const method of enabledPaymentMethods) {
                if (!validMethods.includes(method)) {
                    return res.status(400).json({ error: `Invalid payment method: ${method}` });
                }
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                zelleEmail: zelleEmail || null,
                venmoUsername: venmoUsername || null,
                cashAppUsername: cashAppUsername || null,
                enabledPaymentMethods: enabledPaymentMethods ? JSON.stringify(enabledPaymentMethods) : null,
                businessLogo: businessLogo || null,
                paymentInstructions: paymentInstructions || null,
            },
            select: {
                zelleEmail: true,
                venmoUsername: true,
                cashAppUsername: true,
                stripeConnected: true,
                enabledPaymentMethods: true,
                businessLogo: true,
                paymentInstructions: true,
            },
        });

        // Parse enabled methods for response
        let parsedMethods: string[] = [];
        if (updated.enabledPaymentMethods) {
            try {
                parsedMethods = JSON.parse(updated.enabledPaymentMethods);
            } catch (e) {
                console.error('Error parsing enabledPaymentMethods:', e);
            }
        }

        res.json({
            ...updated,
            enabledPaymentMethods: parsedMethods,
        });
    } catch (error) {
        console.error('Error updating payment settings:', error);
        res.status(500).json({ error: 'Failed to update payment settings' });
    }
});

/**
 * POST /api/payments/stripe/connect
 * Initiate Stripe OAuth connection (placeholder for now)
 */
router.post('/stripe/connect', async (req, res) => {
    try {
        // TODO: Implement Stripe OAuth flow
        // For now, just return a message
        res.json({
            message: 'Stripe connection not yet implemented. Add STRIPE_SECRET_KEY to enable.',
            connectUrl: 'https://connect.stripe.com/oauth/authorize',
        });
    } catch (error) {
        console.error('Error connecting Stripe:', error);
        res.status(500).json({ error: 'Failed to connect Stripe' });
    }
});

/**
 * DELETE /api/payments/stripe/disconnect
 * Disconnect Stripe account
 */
router.delete('/stripe/disconnect', async (req, res) => {
    try {
        const userId = req.user!.id;

        await prisma.user.update({
            where: { id: userId },
            data: {
                stripeAccountId: null,
                stripeConnected: false,
            },
        });

        res.json({ message: 'Stripe disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting Stripe:', error);
        res.status(500).json({ error: 'Failed to disconnect Stripe' });
    }
});

export default router;
