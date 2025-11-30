"use client";
import { useEffect, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";

type HQStats = {
  totalShops: number;
  totalDeliveries: number;
  todayDeliveries: number;
  totalRevenue: number;
  activeShops: number;
  regions: Array<{
    name: string;
    shops: number;
    deliveries: number;
    revenue: number;
  }>;
};

type RecentDelivery = {
  id: string;
  shopName: string;
  clientName: string;
  date: string;
  amount: number;
  status: string;
  region: string;
};

export default function HQAdminDashboard() {
  const [stats, setStats] = useState<HQStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data for real-time calculations
        const [statsData, deliveriesData, shopsData] = await Promise.all([
          apiAuthGet<HQStats>("/test/hq-admin/stats"),
          apiAuthGet<any[]>("/test/hq-admin/deliveries"),
          apiAuthGet<any[]>("/test/hq-admin/shops")
        ]);
        
        // Calculate real-time statistics
        const calculatedStats = calculateRealTimeStats(deliveriesData, shopsData);
        setStats(calculatedStats);
        
        // Get recent deliveries from all data
        const recentDeliveries = getRecentDeliveries(deliveriesData);
        setRecentDeliveries(recentDeliveries);
        
      } catch (err: any) {
        console.error("Error fetching HQ admin data:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateRealTimeStats = (deliveries: any[], shops: any[]): HQStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Total shops
    const totalShops = shops.length;
    
    // Active shops (with deliveries in the last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeShops = new Set(
      deliveries
        .filter(d => new Date(d.date) >= thirtyDaysAgo)
        .map(d => d.shopId)
    ).size;
    
    // Total deliveries
    const totalDeliveries = deliveries.length;
    
    // Today's deliveries
    const todayDeliveries = deliveries.filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate >= today && deliveryDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;
    
    // Total revenue
    const totalRevenue = deliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    
    // Group by region
    const regionStats = deliveries.reduce((acc, d) => {
      const region = d.region || 'Non défini';
      if (!acc[region]) {
        acc[region] = { shops: new Set(), deliveries: 0, revenue: 0 };
      }
      acc[region].shops.add(d.shopId);
      acc[region].deliveries += 1;
      acc[region].revenue += d.totalAmount;
      return acc;
    }, {} as Record<string, { shops: Set<string>, deliveries: number, revenue: number }>);
    
    const regions = (Object.entries(regionStats) as [string, { shops: Set<string>, deliveries: number, revenue: number }][])
      .map(([name, data]) => ({
        name,
        shops: data.shops.size,
        deliveries: data.deliveries,
        revenue: data.revenue
      })).sort((a, b) => b.revenue - a.revenue);
    
    return {
      totalShops,
      totalDeliveries,
      todayDeliveries,
      totalRevenue,
      activeShops,
      regions
    };
  };

  const getRecentDeliveries = (deliveries: any[]): RecentDelivery[] => {
    return deliveries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(d => ({
        id: d.id,
        shopName: d.shopName,
        clientName: d.clientName,
        date: d.date,
        amount: d.totalAmount,
        status: d.status,
        region: d.region || 'Non défini'
      }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <HQAdminLayout>
        <LoadingSpinner text="Chargement du dashboard HQ Admin..." />
      </HQAdminLayout>
    );
  }

  if (error) {
    return (
      <HQAdminLayout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </HQAdminLayout>
    );
  }

  return (
    <HQAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard HQ Admin</h1>
          <p className="mt-2 text-gray-600">
            Vue d'ensemble de tous vos magasins par région
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🏪</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Magasins
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalShops || 0}
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
                  <span className="text-2xl">🚚</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Livraisons Aujourd'hui
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.todayDeliveries || 0}
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
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Revenus Totaux
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats?.totalRevenue || 0)}
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
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Magasins Actifs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.activeShops || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regions Overview */}
        {stats?.regions && stats.regions.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Performance par Région
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.regions.map((region, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {region.name}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Magasins: {region.shops}</p>
                      <p>Livraisons: {region.deliveries}</p>
                      <p>Revenus: {formatCurrency(region.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Deliveries */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Livraisons Récentes
            </h3>
            {recentDeliveries.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucune livraison récente
              </p>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Magasin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {delivery.shopName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {delivery.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(delivery.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(delivery.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            delivery.status === 'delivered' 
                              ? 'bg-green-100 text-green-800'
                              : delivery.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {delivery.status === 'delivered' ? 'Livrée' : 
                             delivery.status === 'in_progress' ? 'En cours' : 'Programmée'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQAdminLayout>
  );
}

