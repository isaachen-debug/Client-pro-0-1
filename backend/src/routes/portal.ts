import { Router } from 'express';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
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
        let customer = null;
        let decodedUserId = null;

        // 1. Try to verify as JWT (New System)
        try {
            // We need the secret. Ideally imported, but for now using process.env matching auth.ts
            const JWT_SECRET = process.env.JWT_SECRET || 'clientepro-secret';
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            decodedUserId = decoded.userId;
        } catch (e) {
            // Not a valid JWT, proceed to check as legacy access token
        }

        if (decodedUserId) {
            // It's a valid JWT. Find the Client User.
            const user = await prisma.user.findUnique({
                where: { id: decodedUserId },
                include: {
                    company: {
                        select: {
                            id: true,
                            companyName: true,
                            primaryColor: true
                        }
                    }
                }
            });

            if (user && user.role === 'CLIENT') {
                // Find the corresponding Customer record for this user (by email & owner)
                // This ensures we return the strict 'Customer' data the frontend expects
                customer = await prisma.customer.findFirst({
                    where: {
                        email: user.email,
                        userId: user.companyId
                    },
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
            }
        }

        // 2. If not found via JWT, try legacy Access Token
        if (!customer) {
            customer = await prisma.customer.findUnique({
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
        }

        if (!customer) {
            return res.status(404).json({ error: 'Link inválido ou expirado' });
        }

        if (customer.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Acesso ao portal desativado' });
        }

        // Return token to be used in subsequent requests (if frontend needs it)
        // For the new system, we should probably return a fresh JWT or the same one.
        // The frontend stores the token from the URL usually or expects a token in payload.
        // Looking at PortalAccess.tsx, it just redirects to /client/home. 
        // ClientHome.tsx likely uses the stored token.
        // We will send a fresh token if it was a legacy login, or the current one.

        // Return JSON structure expected by PortalAccess.tsx
        res.json({
            success: true,
            token: token, // Pass back the working token
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
