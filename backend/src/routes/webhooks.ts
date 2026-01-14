import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateTwilioSignature, normalizeToE164 } from '../services/twilio';
import { routeInboundSMS } from '../services/smsRouter';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /webhooks/twilio/inbound-sms
 * Receives inbound SMS from Twilio
 */
router.post('/twilio/inbound-sms', async (req, res) => {
    try {
        // Step 1: Validate Twilio signature (security)
        const signature = req.headers['x-twilio-signature'] as string;
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        const isValid = validateTwilioSignature(url, req.body, signature);

        if (!isValid) {
            console.error('[Webhook] Invalid Twilio signature');
            return res.status(403).send('Forbidden');
        }

        // Step 2: Extract webhook data
        const { From, To, MessageSid, Body } = req.body;

        console.log(`[Webhook] Inbound SMS from ${From}: ${Body.substring(0, 50)}...`);

        // Step 3: Idempotency check (prevent duplicate processing)
        const existing = await prisma.message.findUnique({
            where: { providerMessageSid: MessageSid }
        });

        if (existing) {
            console.log('[Webhook] Message already processed (idempotency)');
            return res.status(200).type('text/xml').send('<Response></Response>');
        }

        // Step 4: Normalize phone
        const phoneE164 = normalizeToE164(From);

        // Step 5: Handle STOP/UNSUBSCRIBE
        const bodyLower = Body.trim().toLowerCase();
        if (['stop', 'unsubscribe', 'cancel', 'end', 'quit'].includes(bodyLower)) {
            await prisma.customer.updateMany({
                where: { phoneE164 },
                data: { smsOptOut: true }
            });

            // Remove router links
            await prisma.inboundRouterLink.deleteMany({
                where: { phoneE164 }
            });

            const twiml = `<Response><Message>Você foi descadastrado. Responda START para reativar.</Message></Response>`;
            return res.status(200).type('text/xml').send(twiml);
        }

        // Step 6: Handle START (re-opt-in)
        if (bodyLower === 'start') {
            await prisma.customer.updateMany({
                where: { phoneE164 },
                data: { smsOptOut: false }
            });

            const twiml = `<Response><Message>Bem-vindo de volta! Você reativou as mensagens SMS.</Message></Response>`;
            return res.status(200).type('text/xml').send(twiml);
        }

        // Step 7: Route the message
        const routing = await routeInboundSMS(From, To, Body);

        if (routing.type === 'CONFLICT') {
            // Conflict detected - do NOT route, wait for manual resolution
            console.warn(`[Webhook] Routing conflict: ${routing.message}`);
            // Optionally notify admin via WebSocket/email
            return res.status(200).type('text/xml').send('<Response></Response>');
        }

        if (routing.type === 'UNKNOWN_SENDER') {
            // Unknown sender - optionally create lead or ignore
            console.log(`[Webhook] Unknown sender: ${phoneE164}`);
            return res.status(200).type('text/xml').send('<Response></Response>');
        }

        if (routing.type === 'OPT_OUT') {
            // Customer opted out - silently ignore
            return res.status(200).type('text/xml').send('<Response></Response>');
        }

        // Step 8: SUCCESS - Save message to conversation
        const { userId, customerId } = routing;

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                userId: userId!,
                customerId: customerId!,
                status: 'ACTIVE'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    userId: userId!,
                    customerId: customerId!,
                    status: 'ACTIVE'
                }
            });
        }

        // Save inbound message
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: 'INBOUND',
                body: Body,
                providerMessageSid: MessageSid,
                status: 'RECEIVED'
            }
        });

        console.log(`[Webhook] Message saved to conversation ${conversation.id}`);

        // TODO: Notify user via WebSocket or push notification

        // Step 9: Respond to Twilio (empty = success, no auto-reply)
        return res.status(200).type('text/xml').send('<Response></Response>');

    } catch (error) {
        console.error('[Webhook] Error processing inbound SMS:', error);
        return res.status(500).send('Internal Server Error');
    }
});

export default router;
