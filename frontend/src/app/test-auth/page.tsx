"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = () => {
    router.push('/login?role=shop');
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test d'Authentification
        </h1>
        
        {user ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                ✅ Connecté
              </h2>
              <div className="text-sm text-green-700">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Nom:</strong> {user.displayName || 'Non défini'}</p>
                <p><strong>UID:</strong> {user.uid}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/delivery/new')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Tester /delivery/new
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                ❌ Non connecté
              </h2>
              <p className="text-sm text-red-700">
                Vous devez vous connecter pour accéder aux fonctionnalités.
              </p>
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Se connecter
            </button>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Cette page permet de tester l'état d'authentification
          </p>
        </div>
      </div>
    </div>
  );
}



