"use client";

import { useHydrated } from "@/hooks/useHydrated";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPostLoginPath } from "@/lib/auth-routes";
import { useAuthStore } from "@/stores/useAuthStore";

type GuestAuthGateProps = {
  children: React.ReactNode;
};

/** Login/registro: redirige si ya hay sesión válida. */
export function GuestAuthGate({ children }: GuestAuthGateProps) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const usuario = useAuthStore((s) => s.usuario);
  const isSessionExpired = useAuthStore((s) => s.isSessionExpired());
  const logout = useAuthStore((s) => s.logout);


  useEffect(() => {
    if (!isHydrated) return;

    if (isSessionExpired) {
      logout();
      return;
    }

    if (isAuthenticated && usuario) {
      router.replace(getPostLoginPath(usuario.rol));
    }
  }, [isHydrated, isAuthenticated, isSessionExpired, logout, router, usuario]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (isAuthenticated && usuario && !isSessionExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Redirigiendo...</p>
      </div>
    );
  }

  return <>{children}</>;
}
