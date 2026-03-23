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
import type { User } from "@supabase/supabase-js";

import { createAuthStore, type AuthState, type AuthStore } from "./auth-store";

const AuthStoreContext = createContext<AuthStore | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User;
  initialProfile?: {
    role: string | null;
    onboardingCompleted: boolean;
  };
}

export const AuthProvider = ({
  children,
  initialUser,
  initialProfile,
}: AuthProviderProps) => {
  const [store] = useState(() => {
    const s = createAuthStore();
    if (initialUser) {
      s.getState().setUser(initialUser);
      s.getState().setRole(initialProfile?.role ?? null);
      s.getState().setOnboardingCompleted(
        initialProfile?.onboardingCompleted ?? false
      );
      s.getState().setIsProfileLoaded(true);
    }
    return s;
  });

  useEffect(() => {
    const supabase = createClient();
    let fetchVersion = 0;
    let unmounted = false;

    const fetchProfile = async (userId: string) => {
      const version = ++fetchVersion;
      store.getState().setIsProfileLoaded(false);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, role")
          .eq("id", userId)
          .single();
        if (error) throw error;
        if (unmounted || version !== fetchVersion) return;
        const s = store.getState();
        s.setOnboardingCompleted(data?.onboarding_completed ?? false);
        s.setRole(data?.role ?? null);
      } catch {
        if (unmounted || version !== fetchVersion) return;
        const s = store.getState();
        s.setOnboardingCompleted(false);
        s.setRole(null);
      } finally {
        if (!unmounted && version === fetchVersion) {
          store.getState().setIsProfileLoaded(true);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (unmounted) return;
      const s = store.getState();
      s.setUser(session?.user ?? null);
      if (session?.user) {
        // 초기 세션은 서버에서 이미 주입했으므로 스킵
        if (event === "INITIAL_SESSION" && initialUser) return;
        fetchProfile(session.user.id);
      } else {
        fetchVersion++;
        s.setOnboardingCompleted(false);
        s.setRole(null);
        s.setIsProfileLoaded(true);
      }
    });

    return () => {
      unmounted = true;
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
