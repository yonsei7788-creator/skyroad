"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/libs/store/auth-provider";

const GA_ID = "G-C61D02N2X0";

export const GaDisableAdmin = () => {
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (role === "admin") {
      (window as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
    }
  }, [role]);

  return null;
};
