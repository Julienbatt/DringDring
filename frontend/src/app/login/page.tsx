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
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getErrorMessage } from "@/types";

type FirebaseError = {
  code?: string;
  message?: string;
};

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'client';

  useEffect(() => {
    // Handle redirect results (in case popup is blocked or fails)
    getRedirectResult(auth)
      .then(() => {
        // If successful, AuthGate will pick up the signed-in state
      })
      .catch((e: unknown) => {
        const firebaseError = e as FirebaseError;
        if (firebaseError?.code) setError(firebaseError.code);
      });
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Rediriger selon le rôle après connexion
        switch (role) {
          case 'shop':
            router.replace("/shop");
            break;
          case 'client':
            router.replace("/client");
            break;
          case 'admin':
            router.replace("/admin");
            break;
          default:
            router.replace("/");
        }
      }
    });
    return () => unsub();
  }, [router, role]);

  const loginWithGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      // Redirection sera gérée par onAuthStateChanged
    } catch (e: unknown) {
      console.error("Google login error:", e);
      const firebaseError = e as FirebaseError;
      setError(firebaseError?.code || firebaseError?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogleRedirect = async () => {
    setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    } catch (e: unknown) {
      console.error("Google redirect login error:", e);
      const firebaseError = e as FirebaseError;
      setError(firebaseError?.code || firebaseError?.message || "Login failed");
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'shop':
        return {
          title: 'Connexion Magasin',
          description: 'Accédez à votre interface magasin pour gérer vos livraisons',
          color: 'blue',
          icon: '🏪'
        };
      case 'client':
        return {
          title: 'Connexion Client',
          description: 'Accédez à votre espace client pour suivre vos livraisons',
          color: 'green',
          icon: '👤'
        };
      case 'admin':
        return {
          title: 'Connexion Admin',
          description: 'Accédez aux outils d\'administration',
          color: 'purple',
          icon: '🔧'
        };
      default:
        return {
          title: 'Connexion',
          description: 'Connectez-vous à votre compte',
          color: 'blue',
          icon: '🔐'
        };
    }
  };

  const roleInfo = getRoleInfo(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">DringDring</h1>
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">{roleInfo.icon}</div>
            <h2 className="text-3xl font-bold text-gray-900">
              {roleInfo.title}
            </h2>
            <p className="mt-2 text-gray-600">
              {roleInfo.description}
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <button
                  onClick={loginWithGoogle}
                  disabled={loading}
                  className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                    roleInfo.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    roleInfo.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    roleInfo.color === 'blue' ? 'focus:ring-blue-500' :
                    roleInfo.color === 'green' ? 'focus:ring-green-500' :
                    'focus:ring-purple-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Connexion en cours...
                    </div>
                  ) : (
                    <>
                      <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      </span>
                      Se connecter avec Google
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={loginWithGoogleRedirect}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  Ou utiliser la redirection (si popup bloqué)
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm text-center p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Role-specific information */}
              {role === 'shop' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-md">
                  <p className="font-medium">Accès par invitation</p>
                  <p>Contactez votre admin régional pour obtenir l'accès à votre interface magasin.</p>
                </div>
              )}

              {role === 'admin' && (
                <div className="bg-purple-50 border border-purple-200 text-purple-700 text-sm p-3 rounded-md">
                  <p className="font-medium">Accès administrateur</p>
                  <p>Contactez le super admin pour obtenir l'accès aux outils d'administration.</p>
                </div>
              )}

              {role === 'client' && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Pas encore de compte ?
                  </p>
                  <Link
                    href="/signup?role=client"
                    className="text-sm text-green-600 hover:text-green-500 font-medium"
                  >
                    Créer un compte client →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}