"use client";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    // Handle redirect results (in case popup is blocked or fails)
    getRedirectResult(auth)
      .then(() => {
        // If successful, AuthGate will pick up the signed-in state
      })
      .catch((e: any) => {
        if (e?.code) setError(e.code);
      });
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      }
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error("Google login error:", e);
      setError(e?.code || e?.message || "Login failed");
    }
  };

  const loginWithGoogleRedirect = async () => {
    setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    } catch (e: any) {
      console.error("Google redirect login error:", e);
      setError(e?.code || e?.message || "Login failed");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Se connecter</h1>
      <div className="mt-4 flex gap-3 flex-wrap">
        <button className="px-4 py-2 bg-black text-white rounded" onClick={loginWithGoogle}>
          Continuer avec Google
        </button>
        <button className="px-4 py-2 border rounded" onClick={loginWithGoogleRedirect}>
          Continuer avec Google (redir.)
        </button>
        <button className="px-4 py-2 border rounded" onClick={logout}>
          Se déconnecter
        </button>
      </div>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </main>
  );
}


