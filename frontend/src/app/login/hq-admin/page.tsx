"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import PausedScreen from "@/components/PausedScreen";
import { ENABLE_HQ_FEATURES } from "@/lib/featureFlags";

export default function HQAdminLoginPage() {
  if (!ENABLE_HQ_FEATURES) {
    return (
      <PausedScreen
        title="Connexion HQ Admin en pause"
        description="L’accès HQ Admin sera de nouveau disponible dès que les APIs correspondantes seront prêtes."
      />
    );
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Connexion HQ Admin réussie !", "success");
      router.push("/hq-admin");
    } catch (error: any) {
      console.error("Erreur de connexion HQ Admin:", error);
      showToast("Erreur de connexion. Accès HQ Admin requis.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center mb-6">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">DringDring</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Connexion HQ Admin
          </h2>
          <p className="mt-2 text-gray-600">
            Gestion des magasins de votre enseigne par région
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email HQ Admin
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="hq.admin@migros.ch"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe HQ Admin
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Connexion..." : "Se connecter en tant que HQ Admin"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="text-purple-600 hover:text-purple-500 text-sm font-medium"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Fonctionnalités HQ Admin
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-purple-500 mr-2">✓</span>
              Gestion multi-magasin de votre enseigne
            </li>
            <li className="flex items-center">
              <span className="text-purple-500 mr-2">✓</span>
              Vue d'ensemble par région (Valais, Vaud, etc.)
            </li>
            <li className="flex items-center">
              <span className="text-purple-500 mr-2">✓</span>
              Rapports consolidés par enseigne
            </li>
            <li className="flex items-center">
              <span className="text-purple-500 mr-2">✓</span>
              Gestion des utilisateurs de l'enseigne
            </li>
          </ul>
        </div>

        {/* Examples */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Exemples d'enseignes
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Migros Valais (tous les Migros du Valais)</p>
            <p>• Migros Vaud (tous les Migros du Vaud)</p>
            <p>• Coop Valais (tous les Coop du Valais)</p>
            <p>• Manor Sion (tous les Manor de la région)</p>
          </div>
        </div>
      </div>
    </div>
  );
}



