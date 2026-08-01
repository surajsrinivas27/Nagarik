import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'official';
  department?: string;
  preferred_language: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('nagrik_user') || 'null'),
  token: localStorage.getItem('nagrik_token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('nagrik_user', JSON.stringify(user));
    localStorage.setItem('nagrik_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('nagrik_user');
    localStorage.removeItem('nagrik_token');
    set({ user: null, token: null });
  },
}));
