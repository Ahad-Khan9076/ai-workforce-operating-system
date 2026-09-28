import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '@/types';

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'ai-workforce-auth',
      partialize: (state) => ({ session: state.session }),
    },
  ),
);

export function getAccessToken() {
  return useAuthStore.getState().session?.accessToken ?? null;
}
