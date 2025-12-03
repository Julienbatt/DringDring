"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Hook to protect routes requiring authentication
 * Redirects to login if user is not authenticated
 */

type Status = "idle" | "loading" | "authenticated" | "redirecting" | "error";

type Options = {
  redirectTo?: string;
  requireAuth?: boolean;
};

export function useProtectedRoute(options: Options = {}) {
  const { redirectTo = "/login", requireAuth = true } = options;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser && requireAuth) {
          setStatus("redirecting");
          router.push(redirectTo);
          return;
        }

        setUser(currentUser);
        setStatus(currentUser ? "authenticated" : "idle");
      },
      (err) => {
        console.error("useProtectedRoute::auth error", err);
        setError(err instanceof Error ? err.message : "Erreur d'authentification");
        setStatus("error");
        if (requireAuth) {
          router.push(redirectTo);
        }
      }
    );

    return () => unsub();
  }, [redirectTo, requireAuth, router]);

  return { 
    user, 
    status, 
    error,
    loading: status === "loading",
    authenticated: status === "authenticated"
  };
}
