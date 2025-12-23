import { api } from './http';

type SyncEventPayload = {
  summary: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  timeZone?: string;
  location?: string;
  eventId?: string | null;
  appointmentId?: string | null;
  attendees?: string[];
};

export const getGoogleAuthUrl = async () => {
  const { data } = await api.get<{ url: string }>('/google/oauth/url');
  return data.url;
};

export const getGoogleStatus = async () => {
  const { data } = await api.get<{ connected: boolean; reason?: string }>('/google/status');
  return data;
};

export const syncGoogleEvent = async (payload: SyncEventPayload) => {
  const { data } = await api.post('/google/events', payload);
  return data as { ok: boolean; eventId?: string; calendarId?: string };
};

export const importGoogleEvents = async (from?: string, to?: string) => {
  const { data } = await api.post('/google/import', { from, to });
  return data as { ok: boolean; created: number; skipped: number };
};
