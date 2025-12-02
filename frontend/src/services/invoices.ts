import type { Customer, Transaction } from '../types';
import { api } from './http';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceToken?: string;
  status: string;
  price: number;
  date: string;
  startTime: string;
  endTime?: string;
  estimatedDurationMinutes?: number;
  serviceType?: string;
  notes?: string;
  customer: Customer;
  transaction?: Transaction;
  company: {
    name?: string;
    email?: string;
    companyName?: string;
    primaryColor?: string;
    avatarUrl?: string;
  };
}

export const invoicesApi = {
  async get(id: string) {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },
};

