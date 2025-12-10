import axios from 'axios';

const TOKEN_KEY = 'Clientepro:token';

const API_BASE_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:3001/api';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

