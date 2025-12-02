import type { CompanyShowcase, OwnerReviewLinks, ThemeOption, User, LanguageOption } from '../types';
import { api } from './http';

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  companyName?: string;
  primaryColor?: string;
  avatarUrl?: string;
  preferredTheme?: ThemeOption;
  preferredLanguage?: LanguageOption;
  whatsappNumber?: string | null;
  contactPhone?: string | null;
  reviewLinks?: OwnerReviewLinks | null;
  companyWebsite?: string | null;
  companyShowcase?: CompanyShowcase | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  async updateProfile(payload: UpdateProfilePayload) {
    const { data } = await api.put<User>('/user/profile', payload);
    return data;
  },
  async updatePassword(payload: UpdatePasswordPayload) {
    await api.put('/user/password', payload);
  },
};

