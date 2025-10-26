"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import AuthGate from "@/components/AuthGate";

export default function TokenDebugPage() {
  const [token, setToken] = useState<string>("");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setErr("Not signed in");
          setToken("");
          return;
        }
        const t = await user.getIdToken(true);
        setToken(t);
        setErr("");
      } catch (e: any) {
        setErr(e?.message || "Failed to get token");
        setToken("");
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthGate>
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">Debug: ID Token</h1>
        {err && <p className="text-red-600">{err}</p>}
        <textarea className="w-full h-48 p-2 border rounded font-mono" readOnly value={token} />
        <p className="text-sm text-gray-600">Copy this token and use it in the admin curl command.</p>
      </main>
    </AuthGate>
  );
}


