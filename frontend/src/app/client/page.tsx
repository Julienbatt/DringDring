"use client";
import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getMe, apiAuthGet } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

type Me = {
  userId: string;
  email?: string;
  roles: string[];
  shopId?: string | null;
};

type ClientStats = {
  totalDeliveries: number;
  thisMonth: number;
  totalBags: number;
  averageBags: number;
  upcomingDeliveries: number;
  lastDelivery?: string;
};

type UpcomingDelivery = {
  id: string;
  date: string;
  timeSlot: string;
  bags: number;
  status: string;
  shopName: string;
};

export default function ClientDashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingDelivery[]>([]);
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
      const [statsData, upcomingData, allDeliveriesData] = await Promise.all([
        apiAuthGet<ClientStats>("/test/client/stats"),
        apiAuthGet<UpcomingDelivery[]>("/test/client/deliveries/upcoming"),
        apiAuthGet<any[]>("/test/client/deliveries")
      ]);
      
      // Calculer les statistiques en temps réel
      const calculatedStats = calculateRealTimeStats(allDeliveriesData);
      setStats(calculatedStats);
      setUpcoming(upcomingData);
    } catch (error: any) {
      console.error("Erreur chargement client:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRealTimeStats = (deliveries: any[]): ClientStats => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Calculs en temps réel
    const totalDeliveries = deliveries.length;
    const thisMonthDeliveries = deliveries.filter(d => 
      new Date(d.date) >= thisMonth
    ).length;
    
    const totalBags = deliveries.reduce((sum, d) => sum + d.bags, 0);
    const averageBags = totalDeliveries > 0 ? totalBags / totalDeliveries : 0;
    
    const upcomingDeliveries = deliveries.filter(d => 
      new Date(d.date) > now && d.status !== 'delivered' && d.status !== 'cancelled'
    ).length;
    
    const lastDelivery = deliveries.length > 0 ? 
      deliveries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 
      undefined;

    return {
      totalDeliveries,
      thisMonth: thisMonthDeliveries,
      totalBags,
      averageBags: Math.round(averageBags * 10) / 10,
      upcomingDeliveries,
      lastDelivery
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('fr-CH', {
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
                                  {formatDate(delivery.date)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatTime(delivery.date)} • {delivery.bags} sac{delivery.bags > 1 ? 's' : ''}
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
