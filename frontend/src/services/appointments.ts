import type { Appointment, AppointmentStatus } from '../types';
import { api } from './http';

export type AppointmentPayload = {
  customerId: string;
  date: string; // yyyy-mm-dd
  startTime: string;
  endTime?: string;
  price: number;
  helperFee?: number;
  status?: AppointmentStatus;
  isRecurring?: boolean;
  recurrenceRule?: string;
  notes?: string;
  estimatedDurationMinutes?: number;
  assignedHelperId?: string | null;
  checklistSnapshot?: { title: string }[];
};

export const appointmentsApi = {
  async listByMonth(month: number, year: number) {
    const { data } = await api.get<Appointment[]>('/appointments/month', {
      params: { month, year },
    });
    return data;
  },
  async listByWeek(startDate: string) {
    const { data } = await api.get<Appointment[]>('/appointments/week', {
      params: { startDate },
    });
    return data;
  },
  async listByDate(date: string) {
    const { data } = await api.get<Appointment[]>('/appointments', {
      params: { date },
    });
    return data;
  },
  async listByCustomer(customerId: string) {
    const { data } = await api.get<Appointment[]>('/appointments', {
      params: { customerId },
    });
    return data;
  },
  async listToday() {
    const { data } = await api.get<Appointment[]>('/appointments/today');
    return data;
  },
  async create(payload: AppointmentPayload) {
    const { data } = await api.post<Appointment>('/appointments', payload);
    return data;
  },
  async update(id: string, payload: Partial<AppointmentPayload>) {
    const { data } = await api.put<Appointment>(`/appointments/${id}`, payload);
    return data;
  },
  async changeStatus(id: string, status: AppointmentStatus, options?: { sendInvoice?: boolean }) {
    const { data } = await api.patch<Appointment & { invoiceUrl?: string }>(`/appointments/${id}/status`, {
      status,
      sendInvoice: options?.sendInvoice,
    });
    return data;
  },
  async start(id: string) {
    const { data } = await api.patch<Appointment>(`/appointments/${id}/start`);
    return data;
  },
  async finish(id: string) {
    const { data } = await api.patch<Appointment>(`/appointments/${id}/finish`);
    return data;
  },
  async deleteSeries(id: string) {
    await api.delete(`/appointments/${id}/series`);
  },
  async remove(id: string) {
    await api.delete(`/appointments/${id}`);
  },
};

