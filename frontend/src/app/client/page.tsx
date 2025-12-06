"use client";
import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getMe, apiAuthGet, type Me } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

type ClientStats = {
  totalDeliveries: number;
  thisMonth: number;
  totalBags: number;
  averageBags: number;
  upcomingDeliveries: number;
  lastDelivery?: string;
};

type ClientDelivery = {
  id: string;
  startWindow: string;
  status: string;
  bags: number;
  shopName?: string;
};

export default function ClientDashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [upcoming, setUpcoming] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setMe(null); return; }
      try {
        const t = await getIdToken(user, true);
        const m = await getMe(t);
        setMe(m);
        
        if (m.roles?.includes("client")) {
          loadClientData();
        }
      } catch (e: any) {
        setMe(null);
      }
    });
    return () => unsub();
  }, []);

  const loadClientData = async () => {
    setLoading(true);
    try {
      const [statsData, deliveriesData] = await Promise.all([
        apiAuthGet<ClientStats>("/client/stats"),
        apiAuthGet<ClientDelivery[]>("/client/deliveries"),
      ]);
      setStats(statsData);
      setUpcoming(getUpcomingDeliveries(deliveriesData));
    } catch (error: any) {
      console.error("Erreur chargement client:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingDeliveries = (deliveries: ClientDelivery[]) => {
    const now = new Date();
    return deliveries
      .filter(d => {
        const dt = new Date(d.startWindow);
        return dt > now && d.status !== "delivered" && d.status !== "cancelled";
      })
      .sort((a, b) => new Date(a.startWindow).getTime() - new Date(b.startWindow).getTime())
      .slice(0, 5);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('fr-CH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ClientLayout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Mon Dashboard Client</h1>
            <p className="mt-2 text-gray-600">Gérez vos livraisons et consultez vos statistiques personnelles</p>
            
            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/client/deliveries"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                📋 Voir toutes mes livraisons
              </Link>
              <Link
                href="/client/stats"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                📊 Mes statistiques détaillées
              </Link>
              <Link
                href="/delivery/new"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
              >
                ➕ Nouvelle livraison
              </Link>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner size="lg" text="Chargement de vos données..." className="py-12" />
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">📦</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total livraisons
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.totalDeliveries || 0}
                          </dd>
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
                          <span className="text-white text-sm font-bold">📅</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Ce mois
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.thisMonth || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">🛍️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total sacs
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.totalBags || 0}
                          </dd>
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
                          <span className="text-white text-sm font-bold">📊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Moyenne/sac
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.averageBags?.toFixed(1) || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Deliveries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Livraisons à venir
                    </h3>
                    {upcoming.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">📅</span>
                        </div>
                        <p className="text-gray-600">Aucune livraison prévue</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcoming.map((delivery) => (
                          <div key={delivery.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {formatDate(delivery.startWindow)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatTime(delivery.startWindow)} • {delivery.bags} sac{delivery.bags > 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {delivery.shopName}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                delivery.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {delivery.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Actions rapides
                    </h3>
                    <div className="space-y-4">
                      <Link
                        href="/client/deliveries"
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Voir toutes mes livraisons
                      </Link>
                      <Link
                        href="/client/profile"
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Modifier mon profil
                      </Link>
                      {stats?.lastDelivery && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Dernière livraison : {formatDate(stats.lastDelivery)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
