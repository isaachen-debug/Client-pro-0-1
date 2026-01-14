import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER!;

export const twilioClient = twilio(accountSid, authToken);

/**
 * Normalize phone number to E.164 format (+55XXXXXXXXXXX)
 */
export function normalizeToE164(phone: string): string {
    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, '');

    // If already starts with country code (55 for Brazil)
    if (digits.startsWith('55') && digits.length >= 12) {
        return `+${digits}`;
    }

    // If starts with 0 (remove it and add +55)
    if (digits.startsWith('0')) {
        return `+55${digits.substring(1)}`;
    }

    // Otherwise assume Brazil and add +55
    return `+55${digits}`;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(to: string, body: string) {
    try {
        const phoneE164 = normalizeToE164(to);

        const message = await twilioClient.messages.create({
            from: twilioNumber,
            to: phoneE164,
            body
        });

        return {
            success: true,
            sid: message.sid,
            status: message.status
        };
    } catch (error: any) {
        console.error('[Twilio] Send SMS error:', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

/**
 * Validate Twilio webhook signature (security)
 */
export function validateTwilioSignature(
    url: string,
    params: Record<string, any>,
    signature: string
): boolean {
    return twilio.validateRequest(authToken, signature, url, params);
}
