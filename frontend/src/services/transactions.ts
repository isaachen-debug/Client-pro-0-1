import type { Transaction, TransactionStatus } from '../types';
import { api } from './http';

export const transactionsApi = {
  async listByPeriod(from: string, to: string) {
    const { data } = await api.get<Transaction[]>('/transactions', {
      params: { from, to },
    });
    return data;
  },
  async create(payload: {
    appointmentId?: string;
    type: string;
    status: TransactionStatus;
    amount: number;
    dueDate: string;
    paidAt?: string | null;
    description?: string | null;
  }) {
    const { data } = await api.post<Transaction>('/transactions', payload);
    return data;
  },
  async updateStatus(id: string, status: TransactionStatus) {
    const { data } = await api.patch<Transaction>(`/transactions/${id}/status`, { status });
    return data;
  },
  async resetAll() {
    const { data } = await api.delete<{ success: boolean }>('/transactions');
    return data;
  },
  async exportCsv(from: string, to: string) {
    const response = await api.get('/transactions/export', {
      params: { from, to },
      responseType: 'blob',
    });
    return response.data;
  },
};
