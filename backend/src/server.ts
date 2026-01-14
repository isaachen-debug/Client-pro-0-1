import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import appointmentsRouter from './routes/appointments';
import transactionsRouter from './routes/transactions';
import dashboardRouter from './routes/dashboard';
import userRouter from './routes/user';
import invoicesRouter from './routes/invoices';
import helperRouter from './routes/helper';
import teamRouter from './routes/team';
import portalRoutes from './routes/portal';
import clientPortalRouter from './routes/clientPortal';
import notificationsRouter from './routes/notifications';
import aiRouter from './routes/ai';
import agentIntentRouter from './routes/agentIntent';
import faqsRouter from './routes/faqs';
import templatesRouter from './routes/templates';
import agentAudioRouter from './routes/agentAudio';
import googleCalendarRouter from './routes/googleCalendar';
import geoRouter from './routes/geo';
import smsRouter from './routes/sms';
import webhooksRouter from './routes/webhooks';
import { initDailyReminderJob } from './jobs/dailyReminders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG_LOG_PATH = '/Users/isaachenrik/projeto code/.cursor/debug.log';

const appendDebugLog = (payload: Record<string, any>) => {
  try {
    const dir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify(payload) + '\n');
  } catch {
    // ignore logging errors
  }
};

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Clean Up API rodando!' });
});

// #region agent log
app.use((req, _res, next) => {
  appendDebugLog({
    sessionId: 'debug-session',
    runId: 'pre-fix',
    hypothesisId: 'H1',
    location: 'backend/src/server.ts:request',
    message: 'Incoming request',
    data: {
      method: req.method,
      path: req.path,
      host: req.headers.host,
    },
    timestamp: Date.now(),
  });
  next();
});
// #endregion

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/customers', customersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/helper', helperRouter);
app.use('/api/team', teamRouter);
app.use('/api/portal', portalRoutes);
app.use('/api/client', clientPortalRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/agent', aiRouter);
app.use('/api/agent/intent', agentIntentRouter);
app.use('/api/agent/audio', agentAudioRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/google', googleCalendarRouter);
app.use('/api/geo', geoRouter);
app.use('/api/sms', smsRouter);
app.use('/webhooks', webhooksRouter);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}`);
  initDailyReminderJob();
  // #region agent log
  appendDebugLog({
    sessionId: 'debug-session',
    runId: 'pre-fix',
    hypothesisId: 'H1',
    location: 'backend/src/server.ts:listen',
    message: 'Server started',
    data: { port: PORT },
    timestamp: Date.now(),
  });
  // #endregion
});
