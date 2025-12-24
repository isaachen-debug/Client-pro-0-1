import { api } from './http';

type Intent =
  | 'create_client'
  | 'create_appointment'
  | 'create_appointments_batch'
  | 'update_appointment'
  | 'cancel_appointment'
  | 'count_today'
  | 'count_tomorrow'
  | 'count_clients'
  | 'charges_status'
  | 'appointments_today'
  | 'appointments_tomorrow'
  | 'appointments_week'
  | 'appointments_month'
  | 'appointments_pending_today'
  | 'clients_recent'
  | 'clients_with_future'
  | 'unknown';

export type AgentIntent = Intent;

export type AgentMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type AgentIntentResponse = {
  intent: Intent;
  requiresConfirmation?: boolean;
  summary?: string;
  payload?: any;
  answer?: string;
  error?: string;
};

export const agentIntentApi = {
  async parse(message: string, history?: AgentMessage[], context?: unknown) {
    const { data } = await api.post<AgentIntentResponse>('/agent/intent', { message, history, context });
    return data;
  },
  async execute(intent: Intent, payload?: any) {
    const { data } = await api.post<{ ok?: boolean; answer?: string; error?: string }>(
      '/agent/intent/execute',
      { intent, payload },
    );
    return data;
  },
};
