"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";

import { createClient } from "@/libs/supabase/client";

import { createAuthStore, type AuthState, type AuthStore } from "./auth-store";

const AuthStoreContext = createContext<AuthStore | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(() => createAuthStore());

  useEffect(() => {
    const supabase = createClient();

    const fetchProfile = async (userId: string) => {
      const state = store.getState();
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, role")
          .eq("id", userId)
          .single();
        if (error) throw error;
        state.setOnboardingCompleted(data?.onboarding_completed ?? false);
        state.setRole(data?.role ?? null);
      } catch {
        // 프로필 조회 실패 시 기존 값 유지하되, 최초 로드면 기본값 설정
        if (!state.isProfileLoaded) {
          state.setOnboardingCompleted(false);
          state.setRole(null);
        }
      } finally {
        state.setIsProfileLoaded(true);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const state = store.getState();
      state.setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        state.setIsProfileLoaded(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const state = store.getState();
      state.setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        state.setOnboardingCompleted(false);
        state.setRole(null);
        state.setIsProfileLoaded(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthStoreContext.Provider value={store!}>
      {children}
    </AuthStoreContext.Provider>
  );
};

export const useAuthStore = <T,>(selector: (state: AuthState) => T): T => {
  const store = useContext(AuthStoreContext);
  if (!store) {
    throw new Error("useAuthStore must be used within AuthProvider");
  }
  return useStore(store, selector);
};
