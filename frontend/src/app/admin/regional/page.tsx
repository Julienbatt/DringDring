"use client";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiAuthGet } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

type RegionalStats = {
  totalShops: number;
  totalDeliveries: number;
  totalRevenue: number;
  activeCouriers: number;
  thisWeekDeliveries: number;
  thisWeekRevenue: number;
};

type Shop = {
  id: string;
  name: string;
  chain: string;
  deliveries: number;
  revenue: number;
  lastDelivery: string;
  status: 'active' | 'inactive';
};

export default function RegionalAdminPage() {
  const [stats, setStats] = useState<RegionalStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        router.push('/login?role=admin');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadRegionalData();
    }
  }, [user]);

  const loadRegionalData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data for real-time calculations
      const [deliveriesData, shopsData] = await Promise.all([
        apiAuthGet<any[]>("/test/regional/deliveries"),
        apiAuthGet<any[]>("/test/regional/shops")
      ]);
      
      // Calculate real-time statistics
      const calculatedStats = calculateRealTimeStats(deliveriesData, shopsData);
      setStats(calculatedStats);
      
      // Calculate shop data
      const calculatedShops = calculateShopData(deliveriesData, shopsData);
      setShops(calculatedShops);
      
    } catch (error) {
      console.error("Erreur chargement données régionales:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRealTimeStats = (deliveries: any[], shops: any[]): RegionalStats => {
    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Total shops
    const totalShops = shops.length;
    
    // Total deliveries
    const totalDeliveries = deliveries.length;
    
    // Total revenue
    const totalRevenue = deliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    
    // This week's deliveries
    const thisWeekDeliveries = deliveries.filter(d => 
      new Date(d.date) >= thisWeekStart
    ).length;
    
    // This week's revenue
    const thisWeekRevenue = deliveries
      .filter(d => new Date(d.date) >= thisWeekStart)
      .reduce((sum, d) => sum + d.totalAmount, 0);
    
    // Active couriers (simulation - would need courier data)
    const activeCouriers = 3; // Placeholder
    
    return {
      totalShops,
      totalDeliveries,
      totalRevenue,
      activeCouriers,
      thisWeekDeliveries,
      thisWeekRevenue
    };
  };

  const calculateShopData = (deliveries: any[], shops: any[]): Shop[] => {
    return shops.map(shop => {
      const shopDeliveries = deliveries.filter(d => d.shopId === shop.id);
      const totalDeliveries = shopDeliveries.length;
      const totalRevenue = shopDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
      
      // Last delivery date
      const lastDelivery = shopDeliveries.length > 0 ? 
        shopDeliveries
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date :
        null;
      
      // Status based on recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const hasRecentActivity = shopDeliveries.some(d => 
        new Date(d.date) >= sevenDaysAgo
      );
      
      return {
        id: shop.id,
        name: shop.name,
        chain: shop.chain || 'Autre',
        deliveries: totalDeliveries,
        revenue: totalRevenue,
        lastDelivery: lastDelivery ? new Date(lastDelivery).toISOString().split('T')[0] : 'Aucune',
        status: hasRecentActivity ? 'active' : 'inactive'
      };
    }).sort((a, b) => b.revenue - a.revenue);
  };

  if (!user) {
    return null; // Redirection en cours
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Chargement des données régionales..." />
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
              <h1 className="text-3xl font-bold text-gray-900">🌍 Administration Régionale</h1>
              <p className="mt-2 text-gray-600">Gestion des magasins et coursiers de votre région</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
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
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalShops || 0}</dd>
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
                        <span className="text-white text-sm font-bold">📦</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Livraisons</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalDeliveries || 0}</dd>
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
                        <span className="text-white text-sm font-bold">🚴</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Coursiers</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.activeCouriers || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">💰</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Revenus</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString()} CHF` : '0 CHF'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Cette semaine</p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats?.thisWeekDeliveries || 0} livraisons
                    </p>
                    <p className="text-sm text-green-700">
                      {stats?.thisWeekRevenue ? `${stats.thisWeekRevenue.toLocaleString()} CHF` : '0 CHF'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Performance</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats?.totalDeliveries && stats?.totalShops ? 
                        Math.round(stats.totalDeliveries / stats.totalShops) : 0} livraisons/magasin
                    </p>
                    <p className="text-sm text-blue-700">
                      Moyenne régionale
                    </p>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Link
                    href="/admin/regional/shops"
                    className="group bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">🏪</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                          Magasins
                        </h4>
                        <p className="text-sm text-gray-500">Gérer les magasins</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/regional/couriers"
                    className="group bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">🚴</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-700">
                          Coursiers
                        </h4>
                        <p className="text-sm text-gray-500">Gérer les coursiers</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/regional/deliveries"
                    className="group bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">📦</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
                          Livraisons
                        </h4>
                        <p className="text-sm text-gray-500">Suivi des livraisons</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/regional/reports"
                    className="group bg-orange-50 rounded-lg p-4 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">📊</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-orange-700">
                          Rapports
                        </h4>
                        <p className="text-sm text-gray-500">Analyses régionales</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Magasins */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Magasins de la Région
                </h3>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Magasin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enseigne
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Livraisons
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenus
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dernière
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {shop.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shop.chain}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shop.deliveries}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shop.revenue.toLocaleString()} CHF
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shop.lastDelivery}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              shop.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {shop.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

