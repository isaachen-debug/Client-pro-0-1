import express from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSMS, normalizeToE164 } from '../services/twilio';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/sms/send
 * Send outbound SMS
 */
router.post('/send', async (req, res) => {
    try {
        const { customerId, body } = req.body;
        const userId = (req as any).user?.id; // Assuming auth middleware sets req.user

        if (!customerId || !body) {
            return res.status(400).json({ error: 'customerId and body are required' });
        }

        // Get customer
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Check opt-out
        if (customer.smsOptOut) {
            return res.status(400).json({ error: 'Customer has opted out of SMS' });
        }

        // Check phone exists
        if (!customer.phoneE164 && !customer.phone) {
            return res.status(400).json({ error: 'Customer has no phone number' });
        }

        const phoneE164 = customer.phoneE164 || normalizeToE164(customer.phone!);

        // Send via Twilio
        const result = await sendSMS(phoneE164, body);

        if (!result.success) {
            return res.status(500).json({ error: result.error, code: result.code });
        }

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                userId: customer.userId,
                customerId: customer.id,
                status: 'ACTIVE'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    userId: customer.userId,
                    customerId: customer.id,
                    status: 'ACTIVE'
                }
            });
        }

        // Save outbound message
        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: 'OUTBOUND',
                body,
                providerMessageSid: result.sid!,
                status: result.status || 'QUEUED'
            }
        });

        return res.status(200).json({
            success: true,
            message,
            twilioSid: result.sid
        });

    } catch (error) {
        console.error('[SMS API] Send error:', error);
        return res.status(500).json({ error: 'Failed to send SMS' });
    }
});

/**
 * GET /api/sms/conversations
 * List all conversations for the authenticated user
 */
router.get('/conversations', async (req, res) => {
    try {
        const userId = (req as any).user?.id;

        const conversations = await prisma.conversation.findMany({
            where: { userId },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        phoneE164: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1 // Last message only
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return res.status(200).json({ conversations });

    } catch (error) {
        console.error('[SMS API] List conversations error:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/sms/conversations/:id/messages
 * Get all messages in a conversation
 */
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        // Verify conversation belongs to user
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                userId
            }
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const messages = await prisma.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: 'asc' }
        });

        return res.status(200).json({ messages });

    } catch (error) {
        console.error('[SMS API] Get messages error:', error);
        return res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
