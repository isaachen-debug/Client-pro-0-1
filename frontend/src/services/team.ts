import type {
  Contract,
  ContractStatus,
  HelperAppointment,
  HelperChecklistItem,
  HelperCostSummary,
  HelperDayResponse,
  HelperExpense,
  HelperLiveStatusResponse,
  HelperPayoutMode,
  User,
} from '../types';
import { api } from './http';

export interface CreateHelperPayload {
  name: string;
  email: string;
  password: string;
}

export interface CreateContractPayload {
  clientId?: string;
  customerId?: string;
  title: string;
  body: string;
  pdfUrl?: string;
  placeholders?: Record<string, unknown>;
  gallery?: { url: string; caption?: string }[];
}

export const teamApi = {
  async list() {
    const { data } = await api.get<{ owner: User; members: User[] }>('/team');
    return data;
  },
  async createHelper(payload: CreateHelperPayload) {
    const { data } = await api.post('/team/helpers', payload);
    return data;
  },
  async helperStatus(date?: string) {
    const { data } = await api.get<HelperLiveStatusResponse>('/team/helpers/status', {
      params: date ? { date } : undefined,
    });
    return data;
  },
  async getHelperDay(helperId: string, date?: string) {
    const { data } = await api.get<HelperDayResponse>(`/team/helpers/${helperId}/day`, {
      params: date ? { date } : undefined,
    });
    return data;
  },
  async delete(helperId: string) {
    await api.delete(`/team/helpers/${helperId}`);
  },
  async addChecklistItem(appointmentId: string, title: string) {
    const { data } = await api.post<HelperChecklistItem[]>(`/team/appointments/${appointmentId}/checklist`, { title });
    return data;
  },
  async removeChecklistItem(appointmentId: string, taskId: string) {
    const { data } = await api.delete<HelperChecklistItem[]>(`/team/appointments/${appointmentId}/checklist/${taskId}`);
    return data;
  },
  async toggleChecklistItem(appointmentId: string, taskId: string) {
    const { data } = await api.post<HelperChecklistItem[]>(`/team/appointments/${appointmentId}/checklist/${taskId}/toggle`);
    return data;
  },
  async updateAppointmentNotes(appointmentId: string, notes: string) {
    const { data } = await api.patch<HelperAppointment>(`/team/appointments/${appointmentId}/notes`, { notes });
    return data;
  },
  async updateHelperPayout(helperId: string, mode: HelperPayoutMode, value: number) {
    const { data } = await api.put(`/team/helpers/${helperId}/payout`, { mode, value });
    return data as { id: string; helperPayoutMode: HelperPayoutMode; helperPayoutValue: number };
  },
  async getHelperCosts(helperId: string, params?: { from?: string; to?: string }) {
    const { data } = await api.get<HelperCostSummary>(`/team/helpers/${helperId}/costs`, {
      params,
    });
    return data;
  },
  async addHelperExpense(helperId: string, payload: { category: string; amount: number; notes?: string; date?: string }) {
    const { data } = await api.post<HelperExpense>(`/team/helpers/${helperId}/expenses`, payload);
    return data;
  },
  async removeHelperExpense(helperId: string, expenseId: string) {
    await api.delete(`/team/helpers/${helperId}/expenses/${expenseId}`);
  },
  async createClientPortalAccess(
    customerId: string,
    payload: { email: string; name?: string; password?: string },
  ) {
    const { data } = await api.post<{ user: { id: string; name: string; email: string }; temporaryPassword: string }>(
      `/team/clients/${customerId}/portal-user`,
      payload,
    );
    return data;
  },
  async generatePortalLink(customerId: string) {
    const { data } = await api.post<{
      success: boolean;
      link: string;
      token: string;
      customer: { id: string; name: string };
    }>(`/team/customers/${customerId}/portal-link`);
    return data;
  },
  async listContracts() {
    const { data } = await api.get<Contract[]>('/team/clients/contracts');
    return data;
  },
  async createContract(payload: CreateContractPayload) {
    const { data } = await api.post<Contract>('/team/clients/contracts', payload);
    return data;
  },
  async downloadContractPdf(id: string) {
    const response = await api.get(`/team/clients/contracts/${id}/pdf`, { responseType: 'blob' });
    return response.data as Blob;
  },
  async updateContractStatus(id: string, status: ContractStatus, ownerNotes?: string) {
    const { data } = await api.patch<Contract>(`/team/clients/contracts/${id}/status`, {
      status,
      ownerNotes,
    });
    return data;
  },
  async calculateHelperFee(helperId: string, price: number) {
    const { data } = await api.post<{
      helperFee: number;
      explanation: string;
      helper: {
        id: string;
        name: string;
        payoutMode: string;
        payoutValue: number;
      };
    }>(`/team/helpers/${helperId}/calculate-fee`, { price });
    return data;
  },
};

