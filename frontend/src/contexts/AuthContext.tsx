import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import {
  authApi,
  clearToken,
  getStoredToken,
  userApi,
  type LoginPayload,
  type RegisterPayload,
  type UpdatePasswordPayload,
  type UpdateProfilePayload,
} from '../services/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  updatePassword: (payload: UpdatePasswordPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleMe = useCallback(async () => {
    const profile = await authApi.me();
    setUser(profile);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    handleMe()
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [handleMe]);

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const { user } = await authApi.login({ email, password });
    setUser(user);
  }, []);

  const register = useCallback(async ({ name, email, password }: RegisterPayload) => {
    const { user } = await authApi.register({ name, email, password });
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await handleMe();
  }, [handleMe]);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await userApi.updateProfile(payload);
    setUser(updated);
    return updated;
  }, []);

  const updatePassword = useCallback(async (payload: UpdatePasswordPayload) => {
    await userApi.updatePassword(payload);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      updatePassword,
    }),
    [user, isLoading, login, register, logout, refreshUser, updateProfile, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

