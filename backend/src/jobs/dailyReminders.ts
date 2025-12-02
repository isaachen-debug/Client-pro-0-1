import cron from 'node-cron';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import prisma from '../db';
import { sendPushToUser } from '../services/push';

const TIMEZONE = process.env.TIMEZONE || 'America/Sao_Paulo';

const RUN_EXPRESSION = process.env.PUSH_REMINDER_CRON || '0 12 * * *'; // 12h diariamente

export const initDailyReminderJob = () => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('⚠️ Push notifications não configuradas. Job diário não será iniciado.');
    return;
  }

  cron.schedule(
    RUN_EXPRESSION,
    async () => {
      try {
        await sendDailyReminders();
      } catch (error) {
        console.error('Erro no job de lembretes diários', error);
      }
    },
    { timezone: TIMEZONE },
  );

  console.log(`🔔 Job de lembretes configurado (${RUN_EXPRESSION}, timezone ${TIMEZONE}).`);
};

const sendDailyReminders = async () => {
  const tomorrow = addDays(new Date(), 1);
  const dayStart = startOfDay(tomorrow);
  const dayEnd = endOfDay(tomorrow);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: { notIn: ['CANCELADO', 'CANCELADA'] },
    },
    select: {
      userId: true,
      assignedHelperId: true,
      date: true,
      startTime: true,
      customer: { select: { name: true } },
    },
  });

  if (!appointments.length) {
    return;
  }

  const ownerMap = new Map<string, number>();
  const helperMap = new Map<string, number>();

  appointments.forEach((appointment) => {
    ownerMap.set(appointment.userId, (ownerMap.get(appointment.userId) || 0) + 1);
    if (appointment.assignedHelperId) {
      helperMap.set(appointment.assignedHelperId, (helperMap.get(appointment.assignedHelperId) || 0) + 1);
    }
  });

  await Promise.all(
    Array.from(ownerMap.entries()).map(([userId, count]) =>
      sendPushToUser(userId, {
        title: 'Lembrete de limpezas',
        body:
          count === 1
            ? 'Amanhã você tem 1 limpeza. Confirme com o client e alinhe com o Partner.'
            : `Amanhã você tem ${count} limpezas. Confirme com os Clients e repasse as rotas.`,
        url: '/app/agenda',
      }),
    ),
  );

  await Promise.all(
    Array.from(helperMap.entries()).map(([userId, count]) =>
      sendPushToUser(userId, {
        title: 'Rotas de amanhã',
        body:
          count === 1
            ? 'Amanhã você tem 1 visita. Confirme com o Client e revise o checklist.'
            : `Amanhã você tem ${count} visitas. Confirme com os Clients e revise o checklist.`,
        url: '/app/hoje',
      }),
    ),
  );
};

