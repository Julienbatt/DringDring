"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/toast";

export default function RegionalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Connexion admin régional réussie !", "success");
      router.push("/regional");
    } catch (error: any) {
      console.error("Erreur de connexion admin régional:", error);
      showToast("Erreur de connexion. Accès admin régional requis.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center mb-6">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">DringDring</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Connexion Admin Régional
          </h2>
          <p className="mt-2 text-gray-600">
            Gestion régionale et configuration des tarifs
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email admin régional
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="admin.regional@dringdring.ch"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe admin régional
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Connexion..." : "Se connecter en tant qu'admin régional"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="text-orange-600 hover:text-orange-500 text-sm font-medium"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Fonctionnalités admin régional
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-orange-500 mr-2">✓</span>
              Configuration des tarifs régionaux
            </li>
            <li className="flex items-center">
              <span className="text-orange-500 mr-2">✓</span>
              Gestion des magasins de la région
            </li>
            <li className="flex items-center">
              <span className="text-orange-500 mr-2">✓</span>
              Rapports et statistiques régionales
            </li>
            <li className="flex items-center">
              <span className="text-orange-500 mr-2">✓</span>
              Suivi des facturations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}



