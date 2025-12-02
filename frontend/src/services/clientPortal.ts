import type { ClientPortalSummary, ClientPreferences, Contract } from '../types';
import { api } from './http';

export const clientPortalApi = {
  async getHome() {
    const { data } = await api.get<ClientPortalSummary>('/client/home');
    return data;
  },
  async getContracts() {
    const { data } = await api.get<Contract[]>('/client/contracts');
    return data;
  },
  async acceptContract(id: string, clientNotes?: string) {
    const { data } = await api.post<Contract>(`/client/contracts/${id}/accept`, { clientNotes });
    return data;
  },
  async updatePreferences(preferences: ClientPreferences) {
    const { data } = await api.put<{ preferences: ClientPreferences }>('/client/preferences', {
      preferences,
    });
    return data;
  },
  async downloadContractPdf(id: string) {
    const response = await api.get(`/client/contracts/${id}/pdf`, { responseType: 'blob' });
    return response.data as Blob;
  },
};

