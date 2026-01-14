import { Router } from 'express';
import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db';

const router = Router();

/**
 * Generate or regenerate magic link for customer portal access
 * POST /team/customers/:customerId/portal-link
 */
router.post('/customers/:customerId/portal-link', async (req: Request, res: Response) => {
    try {
        const { customerId } = req.params;
        const userId = (req as any).userId;

        // Verify customer belongs to this owner
        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                userId: userId
            }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Generate cryptographically secure token
        const accessToken = crypto.randomBytes(32).toString('hex');

        // Update customer with new access token
        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: { accessToken }
        });

        // Generate the full URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const portalLink = `${baseUrl}/portal/${accessToken}`;

        res.json({
            success: true,
            link: portalLink,
            token: accessToken,
            customer: {
                id: updatedCustomer.id,
                name: updatedCustomer.name
            }
        });
    } catch (error: any) {
        console.error('Error generating portal link:', error);
        res.status(500).json({ error: 'Erro ao gerar link do portal' });
    }
});

/**
 * Authenticate customer via magic link token
 * GET /portal/:token
 */
router.get('/auth/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        // Find customer by access token
        const customer = await prisma.customer.findUnique({
            where: { accessToken: token },
            include: {
                user: {
                    select: {
                        id: true,
                        companyName: true,
                        primaryColor: true
                    }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Link inválido ou expirado' });
        }

        if (customer.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Acesso ao portal desativado' });
        }

        // Set session data for authenticated customer
        (req as any).session = {
            ...((req as any).session || {}),
            customerId: customer.id,
            customerName: customer.name,
            ownerId: customer.userId,
            role: 'CLIENT'
        };

        res.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email
            },
            company: {
                name: customer.user.companyName,
                primaryColor: customer.user.primaryColor
            }
        });
    } catch (error: any) {
        console.error('Error authenticating via token:', error);
        res.status(500).json({ error: 'Erro ao autenticar' });
    }
});

export default router;
