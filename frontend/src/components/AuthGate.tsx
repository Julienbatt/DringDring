"use client";
import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const t = await getIdToken(user, true);
        setToken(t);
        setAuthed(true);
      } else {
        setAuthed(false);
        setToken(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <p className="p-6">Chargement…</p>;
  if (!authed)
    return (
      <main className="p-6">
        <p>Veuillez vous connecter.</p>
        <Link className="text-blue-600 underline" href="/login">
          Aller à la page de connexion
        </Link>
      </main>
    );
  return <>{children}</>;
}


