import type { DashboardOverview } from '../types';
import { api } from './http';

export const dashboardApi = {
  async getMetrics() {
    const { data } = await api.get<DashboardOverview>('/dashboard/overview');
    return data;
  },
};

