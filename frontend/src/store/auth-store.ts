import { create } from 'zustand';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { AuthResponse, LoginCredentials, Role } from '@/types/shared';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  storeId?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials: LoginCredentials) => {
    const { data } = await api.post<AuthResponse>(API_ENDPOINTS.auth.login, credentials);

    Cookies.set('accessToken', data.accessToken, { expires: 1 });
    Cookies.set('refreshToken', data.refreshToken, { expires: 7 });
    Cookies.set('user', JSON.stringify(data.user), { expires: 7 });

    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    set({ user: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  hydrate: () => {
    const token = Cookies.get('accessToken');
    const userRaw = Cookies.get('user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AuthUser;
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
