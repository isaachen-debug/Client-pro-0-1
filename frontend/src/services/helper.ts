import type { HelperAppointment, HelperChecklistItem, HelperDayResponse } from '../types';
import { api } from './http';

export const helperApi = {
  async getDay(date?: string) {
    const { data } = await api.get<HelperDayResponse>('/helper/day', {
      params: date ? { date } : undefined,
    });
    return data;
  },
  async getAppointment(id: string) {
    const { data } = await api.get<HelperAppointment>(`/helper/appointments/${id}`);
    return data;
  },
  async updateStatus(id: string, status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO') {
    const { data } = await api.post<HelperAppointment>(`/helper/appointments/${id}/status`, { status });
    return data;
  },
  async toggleTask(appointmentId: string, taskId: string) {
    const { data } = await api.post<HelperChecklistItem>(`/helper/appointments/${appointmentId}/tasks/${taskId}/toggle`);
    return data;
  },
  async uploadPhoto(id: string, file: File, type: 'BEFORE' | 'AFTER') {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('type', type);
    const { data } = await api.post<{ id: string; url: string; type: string }>(`/helper/appointments/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

