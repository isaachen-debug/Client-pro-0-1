import { api } from './http';

type Intent =
  | 'create_client'
  | 'create_appointment'
  | 'count_today'
  | 'count_tomorrow'
  | 'unknown';

export type AgentIntentResponse = {
  intent: Intent;
  requiresConfirmation?: boolean;
  summary?: string;
  payload?: any;
  answer?: string;
  error?: string;
};

export const agentIntentApi = {
  async parse(message: string) {
    const { data } = await api.post<AgentIntentResponse>('/agent/intent', { message });
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


