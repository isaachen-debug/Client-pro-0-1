import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const {
  GOOGLE_CLIENT_ID = '',
  GOOGLE_CLIENT_SECRET = '',
  GOOGLE_REDIRECT_URI = '',
  GOOGLE_RETURN_URL = 'http://localhost:5173/app/settings',
} = process.env;

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getOAuthClient = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('GOOGLE_OAUTH_MISSING');
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
};

export const buildStateToken = (payload: { userId: string; returnTo?: string }) => {
  const secret = process.env.JWT_SECRET || 'clientepro-secret';
  return jwt.sign(payload, secret, { expiresIn: '10m' });
};

export const parseStateToken = (token: string) => {
  const secret = process.env.JWT_SECRET || 'clientepro-secret';
  return jwt.verify(token, secret) as { userId: string; returnTo?: string };
};

export const getAuthUrl = (state: string) => {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
};

const ensureCalendar = async (auth: any, userId: string) => {
  const calendar = google.calendar({ version: 'v3', auth });
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarId: true },
  });

  if (existing?.googleCalendarId) {
    return existing.googleCalendarId;
  }

  const created = await calendar.calendars.insert({
    requestBody: {
      summary: 'ClientePro',
      timeZone: 'America/Sao_Paulo',
    },
  });

  const calendarId = created.data.id;
  if (!calendarId) throw new Error('CALENDAR_CREATE_FAILED');

  await prisma.user.update({
    where: { id: userId },
    data: { googleCalendarId: calendarId },
  });

  return calendarId;
};

export const exchangeCodeForTokens = async (code: string) => {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
};

export const saveTokensAndCalendar = async (userId: string, tokens: any) => {
  const client = getOAuthClient();
  client.setCredentials(tokens);

  const calendarId = await ensureCalendar(client, userId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? null,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      googleCalendarId: calendarId,
    },
  });

  return { calendarId };
};

export const getUserGoogleAuth = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
      googleCalendarId: true,
    },
  });

  if (!user || !user.googleRefreshToken) {
    throw new Error('GOOGLE_NOT_CONNECTED');
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: user.googleAccessToken ?? undefined,
    refresh_token: user.googleRefreshToken ?? undefined,
    expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : undefined,
  });

  return { client, calendarId: user.googleCalendarId };
};

type EventInput = {
  summary: string;
  description?: string;
  start: string;
  end: string;
  timeZone?: string;
  location?: string;
  eventId?: string | null;
  appointmentId?: string | null;
  attendees?: string[];
};

export const upsertCalendarEvent = async (userId: string, input: EventInput) => {
  const { client, calendarId } = await getUserGoogleAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth: client });
  const targetCalendarId = calendarId || (await ensureCalendar(client, userId));

  const body = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.start, timeZone: input.timeZone || 'America/Sao_Paulo' },
    end: { dateTime: input.end, timeZone: input.timeZone || 'America/Sao_Paulo' },
    attendees: input.attendees
      ?.filter(Boolean)
      ?.map((email) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 30 },
      ],
    },
  };

  let eventId = input.eventId || undefined;
  if (eventId) {
    await calendar.events.update({
      calendarId: targetCalendarId,
      eventId,
      requestBody: body,
    });
  } else {
    const created = await calendar.events.insert({
      calendarId: targetCalendarId,
      requestBody: body,
    });
    eventId = created.data.id || undefined;
  }

  if (input.appointmentId && eventId) {
    await prisma.appointment.updateMany({
      where: { id: input.appointmentId, userId },
      data: { googleEventId: eventId },
    });
  }

  return { eventId, calendarId: targetCalendarId };
};

type ImportOptions = {
  timeMin: Date;
  timeMax: Date;
};

const listCalendarIds = async (calendar: any) => {
  const result = await calendar.calendarList.list();
  const items = result.data.items ?? [];
  const ids = items.map((item) => item.id).filter(Boolean) as string[];
  return ids.length ? ids : ['primary'];
};

const listEvents = async (calendar: any, calendarId: string, options: ImportOptions) => {
  const events: any[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin: options.timeMin.toISOString(),
      timeMax: options.timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    events.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return events;
};

export const importCalendarEvents = async (userId: string, options: ImportOptions) => {
  const { client } = await getUserGoogleAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth: client });
  const calendarIds = await listCalendarIds(calendar);

  let created = 0;
  let skipped = 0;

  for (const calendarId of calendarIds) {
    const events = await listEvents(calendar, calendarId, options);
    for (const event of events) {
      if (!event?.id || event?.status === 'cancelled') {
        continue;
      }

      const existing = await prisma.appointment.findFirst({
        where: { userId, googleEventId: event.id },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const summary = (event.summary || 'Evento Google').trim() || 'Evento Google';
      const lowercaseSummary = summary.toLowerCase();
      let detectedServiceType = 'Google Calendar';
      if (lowercaseSummary.includes('deep clean')) {
        detectedServiceType = 'Deep Clean';
      } else if (lowercaseSummary.includes('regular clean') || lowercaseSummary.includes('standard clean')) {
        detectedServiceType = 'Limpeza Regular';
      } else if (lowercaseSummary.includes('move in') || lowercaseSummary.includes('move out')) {
        detectedServiceType = 'Move-in/out';
      }

      const attendeeEmails = (event.attendees ?? [])
        .map((att: any) => att?.email)
        .filter(Boolean) as string[];

      const customerByEmail = attendeeEmails.length
        ? await prisma.customer.findFirst({
            where: {
              userId,
              OR: attendeeEmails.map((email) => ({ email: { equals: email } })),
            },
          })
        : null;

      const customerByName = await prisma.customer.findFirst({
        where: { userId, name: { equals: summary } },
      });

      const startRaw = event.start?.dateTime || event.start?.date;
      const endRaw = event.end?.dateTime || event.end?.date;
      if (!startRaw) {
        skipped += 1;
        continue;
      }

      const startDate = new Date(startRaw);
      const endDate = endRaw ? new Date(endRaw) : null;
      const isAllDay = !!event.start?.date && !event.start?.dateTime;
      const startTime = isAllDay ? '09:00' : startDate.toISOString().slice(11, 16);
      const endTime = endDate && !isAllDay ? endDate.toISOString().slice(11, 16) : null;

      const notes = [event.description, event.location, attendeeEmails.join(', ')].filter(Boolean).join(' • ') || null;

      const targetCustomer =
        customerByEmail ??
        customerByName ??
        (await prisma.customer.create({
          data: {
            userId,
            name: summary,
            email: attendeeEmails[0] ?? null,
            serviceType: detectedServiceType,
          },
        }));

      await prisma.appointment.create({
        data: {
          userId,
          customerId: targetCustomer.id,
          date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
          startTime,
          endTime: endTime || undefined,
          price: 0,
          status: 'AGENDADO',
          notes,
          googleEventId: event.id,
        },
      });
      created += 1;
    }
  }

  return { created, skipped };
};
