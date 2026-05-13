import { create } from 'zustand';
import api from '../api/client';

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('td_token');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('td_token');
      set({ user: null, loading: false });
    }
  },

  login: async (email, password, otp) => {
    const { data } = await api.post('/auth/login', { email, password, otp });
    localStorage.setItem('td_token', data.token);
    set({ user: data.user });
    return data.user;
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('td_token', data.token);
    set({ user: data.user });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('td_token');
    set({ user: null });
  },
}));
