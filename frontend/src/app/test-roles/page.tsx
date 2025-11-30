"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TestRolesPage() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Test des Rôles
            </h1>
            <p className="text-gray-600 mb-6">
              Vous devez être connecté pour tester les rôles.
            </p>
            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Test du Système de Rôles
        </h1>

        {/* État de l'utilisateur */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            État de l'utilisateur
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>UID:</strong> {user.uid}</p>
              <p><strong>Nom:</strong> {user.displayName || 'Non défini'}</p>
            </div>
            <div>
              <p><strong>Provider:</strong> {user.providerData[0]?.providerId || 'Inconnu'}</p>
              <p><strong>Connecté:</strong> <span className="text-green-600">✅ Oui</span></p>
            </div>
          </div>
        </div>

        {/* Tests de navigation par rôle */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Interface Client */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              👤 Interface Client
            </h3>
            <div className="space-y-3">
              <Link
                href="/client"
                className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-center"
              >
                Dashboard Client
              </Link>
              <Link
                href="/client/deliveries"
                className="block w-full border border-green-600 text-green-600 px-4 py-2 rounded-md hover:bg-green-50 transition-colors text-center"
              >
                Mes Livraisons
              </Link>
              <Link
                href="/client/deliveries/upcoming"
                className="block w-full border border-green-600 text-green-600 px-4 py-2 rounded-md hover:bg-green-50 transition-colors text-center"
              >
                Livraisons à Venir
              </Link>
              <Link
                href="/client/profile"
                className="block w-full border border-green-600 text-green-600 px-4 py-2 rounded-md hover:bg-green-50 transition-colors text-center"
              >
                Mon Profil
              </Link>
            </div>
          </div>

          {/* Interface Magasin */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🏪 Interface Magasin
            </h3>
            <div className="space-y-3">
              <Link
                href="/shop"
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                Dashboard Magasin
              </Link>
              <Link
                href="/delivery/new"
                className="block w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors text-center"
              >
                Nouvelle Livraison
              </Link>
              <Link
                href="/shop/clients"
                className="block w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors text-center"
              >
                Gestion Clients
              </Link>
              <Link
                href="/shop/deliveries"
                className="block w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors text-center"
              >
                Livraisons
              </Link>
            </div>
          </div>

          {/* Interface HQ Admin */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🏢 Interface HQ Admin
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/hq"
                className="block w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-center"
              >
                Dashboard HQ
              </Link>
              <Link
                href="/admin/hq/regions"
                className="block w-full border border-purple-600 text-purple-600 px-4 py-2 rounded-md hover:bg-purple-50 transition-colors text-center"
              >
                Gestion Régions
              </Link>
              <Link
                href="/admin/hq/shops"
                className="block w-full border border-purple-600 text-purple-600 px-4 py-2 rounded-md hover:bg-purple-50 transition-colors text-center"
              >
                Tous les Magasins
              </Link>
              <Link
                href="/admin/hq/reports"
                className="block w-full border border-purple-600 text-purple-600 px-4 py-2 rounded-md hover:bg-purple-50 transition-colors text-center"
              >
                Rapports
              </Link>
            </div>
          </div>

          {/* Interface Regional Admin */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🌍 Interface Regional Admin
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/regional"
                className="block w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors text-center"
              >
                Dashboard Régional
              </Link>
              <Link
                href="/admin/regional/shops"
                className="block w-full border border-orange-600 text-orange-600 px-4 py-2 rounded-md hover:bg-orange-50 transition-colors text-center"
              >
                Magasins Région
              </Link>
              <Link
                href="/admin/regional/couriers"
                className="block w-full border border-orange-600 text-orange-600 px-4 py-2 rounded-md hover:bg-orange-50 transition-colors text-center"
              >
                Coursiers
              </Link>
              <Link
                href="/admin/regional/deliveries"
                className="block w-full border border-orange-600 text-orange-600 px-4 py-2 rounded-md hover:bg-orange-50 transition-colors text-center"
              >
                Livraisons
              </Link>
            </div>
          </div>

          {/* Interface Super Admin */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              👑 Interface Super Admin
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/super"
                className="block w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-center"
              >
                Dashboard Super
              </Link>
              <Link
                href="/admin/super/users"
                className="block w-full border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-center"
              >
                Utilisateurs
              </Link>
              <Link
                href="/admin/super/regions"
                className="block w-full border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-center"
              >
                Régions
              </Link>
              <Link
                href="/admin/super/system"
                className="block w-full border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-center"
              >
                Système
              </Link>
            </div>
          </div>
        </div>

        {/* Tests de sécurité */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔒 Tests de Sécurité
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Test d'accès non autorisé
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Si vous êtes connecté comme client, essayez d'accéder aux fonctionnalités magasin.
              </p>
              <Link
                href="/delivery/new"
                className="text-sm text-yellow-600 hover:text-yellow-800 underline"
              >
                Essayer d'accéder à /delivery/new →
              </Link>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                Test de redirection
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Le système devrait vous rediriger vers la bonne interface.
              </p>
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Retour à l'accueil →
              </Link>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 text-center">
          <button
            onClick={() => auth.signOut()}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
