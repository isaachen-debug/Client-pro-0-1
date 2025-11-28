import axios from 'axios';
import {
  Appointment,
  AppointmentStatus,
  Customer,
  CustomerStatus,
  DashboardOverview,
  LanguageOption,
  ThemeOption,
  Transaction,
  TransactionStatus,
  User,
} from '../types';

const TOKEN_KEY = 'Clientepro:token';

// Base da API: pega do .env em produção e cai pra '/api' em dev/local
const API_BASE_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL
    : '/api';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type AuthResponse = {
  token: string;
  user: User;
};

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  companyName?: string;
  primaryColor?: string;
  avatarUrl?: string;
  preferredTheme?: ThemeOption;
  preferredLanguage?: LanguageOption;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  async register(payload: RegisterPayload) {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    storeToken(data.token);
    return data;
  },
  async login(payload: LoginPayload) {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    storeToken(data.token);
    return data;
  },
  async me() {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearToken();
    }
  },
};

export const userApi = {
  async updateProfile(payload: UpdateProfilePayload) {
    const { data } = await api.put<User>('/user/profile', payload);
    return data;
  },
  async updatePassword(payload: UpdatePasswordPayload) {
    await api.put('/user/password', payload);
  },
};

export type CustomerPayload = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceType?: string;
  status?: CustomerStatus;
  notes?: string;
  defaultPrice?: number;
};

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
  async update(id: string, payload: CustomerPayload) {
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

export type AppointmentPayload = {
  customerId: string;
  date: string; // yyyy-mm-dd
  startTime: string;
  endTime?: string;
  price: number;
  status?: AppointmentStatus;
  isRecurring?: boolean;
  recurrenceRule?: string;
  notes?: string;
  estimatedDurationMinutes?: number;
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

export const dashboardApi = {
  async getMetrics() {
    const { data } = await api.get<DashboardOverview>('/dashboard/overview');
    return data;
  },
};

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

export default api;

