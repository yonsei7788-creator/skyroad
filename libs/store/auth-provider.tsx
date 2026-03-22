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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (unmounted) return;
      const s = store.getState();
      s.setUser(session?.user ?? null);
      if (session?.user) {
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
