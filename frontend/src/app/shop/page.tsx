"use client";
import { useEffect, useState } from "react";
import ShopLayout from "@/components/ShopLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getMe, apiAuthGet } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

type Me = {
  userId: string;
  email?: string;
  roles: string[];
  shopId?: string | null;
};

type ShopStats = {
  todayDeliveries: number;
  activeClients: number;
  monthlyRevenue: number;
  thisMonthDeliveries: number;
  totalDeliveries: number;
  totalRevenue: number;
  averageOrderValue: number;
  upcomingDeliveries: number;
  lastDelivery: string | null;
};

type UpcomingDelivery = {
  id: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  status: string;
  bags: number;
  totalAmount: number;
};

export default function ShopMainPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        setMe(null); 
        setStats(null);
        setUpcoming([]);
        setLoading(false);
        return; 
      }
      try {
        const t = await getIdToken(user, true);
        const m = await getMe(t);
        setMe(m);
        if (m.shopId) {
          await loadShopData();
        }
      } catch (e: any) {
        setMe(null);
        setStats(null);
        setUpcoming([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadShopData = async () => {
    setLoading(true);
    try {
      const [statsData, upcomingData, allDeliveriesData] = await Promise.all([
        apiAuthGet<ShopStats>("/test/shop/stats"),
        apiAuthGet<UpcomingDelivery[]>("/test/shop/deliveries/upcoming"),
        apiAuthGet<any[]>("/test/shop/deliveries")
      ]);
      
      // Calculer les statistiques en temps réel
      const calculatedStats = calculateRealTimeStats(allDeliveriesData);
      setStats(calculatedStats);
      setUpcoming(upcomingData);
    } catch (error: any) {
      console.error("Erreur chargement magasin:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRealTimeStats = (deliveries: any[]): ShopStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Livraisons d'aujourd'hui
    const todayDeliveries = deliveries.filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate >= today && deliveryDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;
    
    // Livraisons du mois
    const thisMonthDeliveries = deliveries.filter(d => 
      new Date(d.date) >= thisMonth
    ).length;
    
    // Chiffre d'affaires du mois
    const monthlyRevenue = deliveries
      .filter(d => new Date(d.date) >= thisMonth)
      .reduce((sum, d) => sum + d.totalAmount, 0);
    
    // Chiffre d'affaires total
    const totalRevenue = deliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    
    // Moyenne des commandes
    const averageOrderValue = deliveries.length > 0 ? totalRevenue / deliveries.length : 0;
    
    // Clients actifs (uniques)
    const uniqueClients = new Set(deliveries.map(d => d.clientId)).size;
    
    // Livraisons à venir
    const upcomingDeliveries = deliveries.filter(d => 
      new Date(d.date) > now && d.status !== 'delivered' && d.status !== 'cancelled'
    ).length;
    
    // Dernière livraison
    const lastDelivery = deliveries.length > 0 ? 
      deliveries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 
      null;

    return {
      todayDeliveries,
      activeClients: uniqueClients,
      monthlyRevenue,
      thisMonthDeliveries,
      totalDeliveries: deliveries.length,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      upcomingDeliveries,
      lastDelivery
    };
  };

  if (loading) {
    return (
      <ShopLayout>
        <LoadingSpinner text="Chargement du dashboard magasin..." />
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Magasin</h1>
            <p className="mt-2 text-gray-600">Gérez vos livraisons et clients</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Livraisons aujourd'hui</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.todayDeliveries || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Clients actifs</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.activeClients || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">CA ce mois</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.monthlyRevenue ? `${stats.monthlyRevenue.toFixed(0)} CHF` : '0 CHF'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Livraisons ce mois</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.thisMonthDeliveries || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📈</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Chiffre d'affaires total</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {stats?.totalRevenue ? `${stats.totalRevenue.toFixed(0)} CHF` : '0 CHF'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📦</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Moyenne par commande</p>
                  <p className="text-2xl font-bold text-green-900">
                    {stats?.averageOrderValue ? `${stats.averageOrderValue.toFixed(0)} CHF` : '0 CHF'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">⏰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Livraisons à venir</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {stats?.upcomingDeliveries || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Livraison + */}
            <Link 
              href="/delivery/new"
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-blue-500 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Livraison +</h3>
                <p className="text-gray-600 text-sm group-hover:text-blue-500 transition-colors">Créer une nouvelle livraison</p>
              </div>
            </Link>

            {/* Clients + */}
            <Link 
              href="/shop/clients/new"
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-green-500 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Clients +</h3>
                <p className="text-gray-600 text-sm group-hover:text-green-500 transition-colors">Ajouter un nouveau client</p>
              </div>
            </Link>

            {/* Edit Profile */}
            <Link 
              href="/shop/profile"
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-purple-500 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">Edit Profile</h3>
                <p className="text-gray-600 text-sm group-hover:text-purple-500 transition-colors">Modifier les données du magasin</p>
              </div>
            </Link>
          </div>

          {/* Section Livraisons en cours */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Livraisons en cours</h2>
                  <p className="text-sm text-gray-600">Aujourd'hui et les jours à venir</p>
                </div>
                <Link 
                  href="/shop/deliveries"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Voir toutes →
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Gestion des livraisons</h3>
                <p className="text-gray-600 mb-4">Table éditable pour toutes les livraisons d'aujourd'hui et du futur</p>
                <div className="flex justify-center space-x-4">
                  <Link 
                    href="/shop/deliveries"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Voir les livraisons
                  </Link>
                  <Link 
                    href="/delivery/new"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Créer une livraison
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Section Résumés agrégés */}
          <div className="mt-8 bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Résumés</h2>
              <p className="text-sm text-gray-600">Agrégations par jour, mois et année</p>
            </div>
            <div className="p-6">
              <Link 
                href="/shop/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Voir le dashboard complet
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
