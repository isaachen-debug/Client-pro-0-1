import type { User } from '../types';
import { api, clearToken, storeToken } from './http';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

type AuthResponse = {
  token: string;
  user: User;
};

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

