import { api } from './http';

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
};

export const faqsApi = {
  async list() {
    const { data } = await api.get<{ items: FaqItem[] }>('/faqs');
    return data.items;
  },
};


