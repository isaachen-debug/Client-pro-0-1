import { Router } from 'express';
import { authenticate as requireAuth } from '../middleware/auth';
import {
  buildStateToken,
  exchangeCodeForTokens,
  getAuthUrl,
  parseStateToken,
  saveTokensAndCalendar,
  upsertCalendarEvent,
  getUserGoogleAuth,
  importCalendarEvents,
} from '../services/googleCalendar';

const router = Router();

router.get('/oauth/url', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });
    const state = buildStateToken({ userId, returnTo: process.env.GOOGLE_RETURN_URL });
    const url = getAuthUrl(state);
    return res.json({ url });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao gerar URL de autorização' });
  }
});

router.get('/oauth/callback', async (req, res) => {
  try {
    const code = req.query.code as string | undefined;
    const stateRaw = req.query.state as string | undefined;
    if (!code || !stateRaw) return res.status(400).send('Código ou state ausente.');

    const { userId, returnTo } = parseStateToken(stateRaw);
    const tokens = await exchangeCodeForTokens(code);
    await saveTokensAndCalendar(userId, tokens);

    const redirectUrl = returnTo || 'http://localhost:5173/app/settings';
    return res.redirect(`${redirectUrl}?google=connected`);
  } catch (error: any) {
    return res.status(400).send(error.message || 'Erro ao processar callback do Google');
  }
});

router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });
    await getUserGoogleAuth(userId);
    return res.json({ connected: true });
  } catch (error: any) {
    return res.json({ connected: false, reason: error.message });
  }
});

router.post('/events', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    const { summary, description, start, end, timeZone, location, eventId, appointmentId, attendees } = req.body || {};
    if (!summary || !start || !end) {
      return res.status(400).json({ error: 'Campos obrigatórios: summary, start, end' });
    }

    const result = await upsertCalendarEvent(userId, {
      summary,
      description,
      start,
      end,
      timeZone,
      location,
      eventId,
      appointmentId,
      attendees,
    });

    return res.json({ ok: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao sincronizar evento' });
  }
});

router.post('/import', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    const from = req.body?.from ? new Date(req.body.from) : new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);
    const to = req.body?.to ? new Date(req.body.to) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const result = await importCalendarEvents(userId, { timeMin: from, timeMax: to });
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao importar eventos do Google' });
  }
});

export default router;
