import type { Customer, CustomerStatus } from '../types';
import { api } from './http';

export type CustomerPayload = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  serviceType?: string;
  status?: CustomerStatus;
  notes?: string;
  defaultPrice?: number;
};

export type CustomerUpdatePayload = Partial<CustomerPayload>;

type CustomerListParams = {
  search?: string;
  status?: CustomerStatus | 'ALL';
};

export const customersApi = {
  async list(params?: CustomerListParams) {
    const { data } = await api.get<Customer[]>('/customers', {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
    });
    return data;
  },
  async create(payload: CustomerPayload) {
    const { data } = await api.post<Customer>('/customers', payload);
    return data;
  },
  async update(id: string, payload: CustomerUpdatePayload) {
    const { data } = await api.put<Customer>(`/customers/${id}`, payload);
    return data;
  },
  async updateStatus(id: string, status: CustomerStatus) {
    const { data } = await api.patch<Customer>(`/customers/${id}/status`, { status });
    return data;
  },
  async remove(id: string) {
    await api.delete(`/customers/${id}`);
  },
};
