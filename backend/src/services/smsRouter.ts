import { PrismaClient } from '@prisma/client';
import { normalizeToE164 } from './twilio';

const prisma = new PrismaClient();

interface RoutingResult {
    type: 'SUCCESS' | 'CONFLICT' | 'UNKNOWN_SENDER' | 'OPT_OUT';
    userId?: string;
    customerId?: string;
    conflictId?: string;
    message?: string;
}

/**
 * Route inbound SMS in shared number mode
 * Implements fail-safe logic to prevent cross-company message leaks
 */
export async function routeInboundSMS(
    from: string,
    to: string,
    body: string
): Promise<RoutingResult> {

    const phoneE164 = normalizeToE164(from);

    // Step 1: Check for existing router link (cached routing decision)
    const link = await prisma.inboundRouterLink.findUnique({
        where: { phoneE164 }
    });

    if (link && link.confidence === 'HIGH') {
        // Strong link found, route directly
        const customer = await prisma.customer.findFirst({
            where: {
                userId: link.userId,
                phoneE164
            }
        });

        if (customer) {
            return {
                type: 'SUCCESS',
                userId: link.userId,
                customerId: customer.id
            };
        }
    }

    // Step 2: Find all customers with this phone number
    const customers = await prisma.customer.findMany({
        where: { phoneE164 }
    });

    // Step 3: Handle based on number of matches
    if (customers.length === 0) {
        // Unknown sender
        return {
            type: 'UNKNOWN_SENDER',
            message: 'No customer found with this phone number'
        };
    }

    if (customers.length === 1) {
        // Unique match - route and create strong link
        const customer = customers[0];

        // Check opt-out
        if (customer.smsOptOut) {
            return {
                type: 'OPT_OUT',
                message: 'Customer has opted out of SMS'
            };
        }

        // Create router link for future fast routing
        await prisma.inbound

        RouterLink.upsert({
            where: { phoneE164 },
            create: {
                phoneE164,
                userId: customer.userId,
                confidence: 'HIGH',
                source: 'UNIQUE_MATCH'
            },
            update: {
                userId: customer.userId,
                confidence: 'HIGH',
                source: 'UNIQUE_MATCH'
            }
        });

        return {
            type: 'SUCCESS',
            userId: customer.userId,
            customerId: customer.id
        };
    }

    // Step 4: Multiple customers found - CONFLICT (fail-safe: do NOT route)
    const candidateUserIds = customers.map(c => c.userId);

    const conflict = await prisma.inboundConflict.create({
        data: {
            fromPhone: phoneE164,
            toPhone: to,
            candidateUserIds: JSON.stringify(candidateUserIds),
            messagePreview: body.substring(0, 100),
            reason: 'MULTIPLE_COMPANIES_SAME_PHONE',
            status: 'PENDING'
        }
    });

    return {
        type: 'CONFLICT',
        conflictId: conflict.id,
        message: `Message from ${phoneE164} requires manual routing (${customers.length} possible recipients)`
    };
}

/**
 * Resolve a conflict manually
 */
export async function resolveConflict(
    conflictId: string,
    selectedUserId: string
): Promise<void> {
    const conflict = await prisma.inboundConflict.findUnique({
        where: { id: conflictId }
    });

    if (!conflict) throw new Error('Conflict not found');

    // Update conflict as resolved
    await prisma.inboundConflict.update({
        where: { id: conflictId },
        data: {
            status: 'RESOLVED',
            resolvedUserId: selectedUserId
        }
    });

    // Create strong router link to prevent future conflicts
    await prisma.inboundRouterLink.upsert({
        where: { phoneE164: conflict.fromPhone },
        create: {
            phoneE164: conflict.fromPhone,
            userId: selectedUserId,
            confidence: 'HIGH',
            source: 'MANUAL_RESOLUTION'
        },
        update: {
            userId: selectedUserId,
            confidence: 'HIGH',
            source: 'MANUAL_RESOLUTION'
        }
    });
}
