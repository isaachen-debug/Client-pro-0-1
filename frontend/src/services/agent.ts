import { api } from './http';

type AgentPayload = {
  message: string;
  context?: Record<string, unknown>;
};

export const agentApi = {
  async ask(payload: AgentPayload) {
    const { data } = await api.post<{ answer: string }>('/agent', payload);
    return data;
  },
};


