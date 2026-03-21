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
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, role")
          .eq("id", userId)
          .single();
        if (error) throw error;
        const s = store.getState();
        s.setOnboardingCompleted(data?.onboarding_completed ?? false);
        s.setRole(data?.role ?? null);
      } catch {
        // 프로필 조회 실패 시 기존 값 유지하되, 최초 로드면 기본값 설정
        const s = store.getState();
        if (!s.isProfileLoaded) {
          s.setOnboardingCompleted(false);
          s.setRole(null);
        }
      } finally {
        store.getState().setIsProfileLoaded(true);
      }
    };

    // onAuthStateChange의 INITIAL_SESSION 이벤트가 getSession()을 대체하므로
    // getSession()을 별도로 호출하지 않음 (중복 호출 시 race condition 발생)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const s = store.getState();
      s.setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        s.setOnboardingCompleted(false);
        s.setRole(null);
        s.setIsProfileLoaded(true);
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
