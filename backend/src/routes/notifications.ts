import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/public-key', (_req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: 'Notificações não configuradas.' });
  }
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', authenticate, async (req, res) => {
  const { endpoint, keys } = req.body || {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Subscription inválida.' });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.user!.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: req.user!.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar subscription', error);
    return res.status(500).json({ error: 'Não foi possível salvar sua subscription.' });
  }
});

router.delete('/subscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint é obrigatório.' });
  }

  try {
    await prisma.pushSubscription.delete({ where: { endpoint } });
  } catch (error) {
    // Ignore caso já tenha sido removido
  }

  return res.json({ success: true });
});

export default router;

