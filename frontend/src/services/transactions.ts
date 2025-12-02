import type { Transaction, TransactionStatus } from '../types';
import { api } from './http';

export const transactionsApi = {
  async listByPeriod(from: string, to: string) {
    const { data } = await api.get<Transaction[]>('/transactions', {
      params: { from, to },
    });
    return data;
  },
  async updateStatus(id: string, status: TransactionStatus) {
    const { data } = await api.patch<Transaction>(`/transactions/${id}/status`, { status });
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

