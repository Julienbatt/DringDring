"use client";
import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PausedScreen from "@/components/PausedScreen";
import { ENABLE_HQ_FEATURES } from "@/lib/featureFlags";

type HqStats = {
  totalShops: number;
  totalDeliveries: number;
  totalRevenue: number;
  activeRegions: number;
  thisMonthDeliveries: number;
  thisMonthRevenue: number;
};

type Region = {
  id: string;
  name: string;
  shops: number;
  deliveries: number;
  revenue: number;
};

export default function HqAdminPage() {
  if (!ENABLE_HQ_FEATURES) {
    return (
      <PausedScreen
        title="Console HQ en pause"
        description="Ces écrans seront disponibles plus tard. Merci d’utiliser les vues Magasin/Client pour le moment."
      />
    );
  }

  const [stats, setStats] = useState<HqStats | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const loadHqData = useCallback(async () => {
    try {
      setLoading(true);
      // Données simulées pour l'interface HQ
      const mockStats: HqStats = {
        totalShops: 24,
        totalDeliveries: 1847,
        totalRevenue: 46250,
        activeRegions: 3,
        thisMonthDeliveries: 342,
        thisMonthRevenue: 8550
      };

      const mockRegions: Region[] = [
        {
          id: "1",
          name: "Valais",
          shops: 12,
          deliveries: 892,
          revenue: 22300
        },
        {
          id: "2", 
          name: "Vaud",
          shops: 8,
          deliveries: 623,
          revenue: 15575
        },
        {
          id: "3",
          name: "Genève",
          shops: 4,
          deliveries: 332,
          revenue: 8375
        }
      ];

      setStats(mockStats);
      setRegions(mockRegions);
    } catch (error) {
      console.error("Erreur chargement données HQ:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/login?role=admin');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadHqData();
    }
  }, [user, loadHqData]);

  if (!user) {
    return null; // Redirection en cours
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des données HQ...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">🏢 Administration Enseigne</h1>
              <p className="mt-2 text-gray-600">Gestion globale de votre enseigne et de ses magasins</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">🏪</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Magasins</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalShops}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📦</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Livraisons Total</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalDeliveries}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">💰</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Revenus Total</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalRevenue?.toLocaleString()} CHF</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">🌍</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Régions</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.activeRegions}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Rapides */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Actions Rapides
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/admin/hq/regions"
                    className="group bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">🌍</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                          Gestion Régions
                        </h4>
                        <p className="text-sm text-gray-500">Administrer les régions</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/hq/shops"
                    className="group bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">🏪</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-700">
                          Tous les Magasins
                        </h4>
                        <p className="text-sm text-gray-500">Voir tous les magasins</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/hq/reports"
                    className="group bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">📊</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
                          Rapports
                        </h4>
                        <p className="text-sm text-gray-500">Analyses et exports</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Régions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Performance par Région
                </h3>
                <div className="space-y-4">
                  {regions.map((region) => (
                    <div key={region.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{region.name}</h4>
                          <p className="text-sm text-gray-500">{region.shops} magasins</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{region.deliveries} livraisons</p>
                          <p className="text-sm text-gray-500">{region.revenue.toLocaleString()} CHF</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
