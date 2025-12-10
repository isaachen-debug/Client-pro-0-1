import { api } from './http';

export type MessageTemplate = {
  id: string;
  label: string;
  category: 'lembrete' | 'confirmacao' | 'cobranca';
  body: string;
  variables: string[];
};

export const templatesApi = {
  async list() {
    const { data } = await api.get<{ items: MessageTemplate[] }>('/templates');
    return data.items;
  },
};


