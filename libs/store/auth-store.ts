import { createStore } from "zustand/vanilla";
import type { User } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  role: string | null;
  isProfileLoaded: boolean;
  onboardingCompleted: boolean;
  hasRecord: boolean;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: string | null) => void;
  setIsProfileLoaded: (loaded: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setHasRecord: (hasRecord: boolean) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export type AuthStore = ReturnType<typeof createAuthStore>;

export const createAuthStore = () =>
  createStore<AuthState>((set) => ({
    user: null,
    role: null,
    isProfileLoaded: false,
    onboardingCompleted: false,
    hasRecord: false,
    isAuthModalOpen: false,
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    setIsProfileLoaded: (loaded) => set({ isProfileLoaded: loaded }),
    setOnboardingCompleted: (completed) =>
      set({ onboardingCompleted: completed }),
    setHasRecord: (hasRecord) => set({ hasRecord }),
    openAuthModal: () => set({ isAuthModalOpen: true }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),
  }));
