"use client";
import { useEffect, useMemo, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import { apiAuthGet } from "@/lib/api";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { PageLoader, PageError } from "@/components/loading/PageState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { RegionList } from "@/components/dashboard/RegionList";
import { formatCurrency, formatDateLabel } from "@/lib/formatters";

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

const quickActions = [
  { title: "Livraisons", description: "Vue consolidée", href: "/hq-admin/deliveries", icon: "🚚", tone: "purple" as const },
  { title: "Magasins", description: "Pilotage local", href: "/hq-admin/shops", icon: "🏪", tone: "green" as const },
  { title: "Utilisateurs", description: "Responsables HQ", href: "/hq-admin/users", icon: "👤", tone: "blue" as const },
  { title: "Rapports", description: "Exports et analyses", href: "/hq-admin/reports", icon: "📊", tone: "orange" as const },
];

export default function HQAdminDashboard() {
  const { user, status } = useProtectedRoute({ redirectTo: "/login?role=hq-admin" });
  const [stats, setStats] = useState<HQStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setError(null);
        const [deliveriesData, shopsData] = await Promise.all([
          apiAuthGet<any[]>("/test/hq-admin/deliveries"),
          apiAuthGet<any[]>("/test/hq-admin/shops"),
        ]);

        setStats(calculateRealTimeStats(deliveriesData, shopsData));
        setRecentDeliveries(getRecentDeliveries(deliveriesData));
      } catch (err: any) {
        console.error("Error fetching HQ admin data:", err);
        setError("Impossible de charger le tableau de bord HQ.");
      }
    };

    fetchData();
  }, [user]);

  const avgRevenuePerShop = useMemo(() => {
    if (!stats?.totalRevenue || !stats?.totalShops) return 0;
    return Math.round(stats.totalRevenue / stats.totalShops);
  }, [stats]);

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

  if (status === "loading" || status === "redirecting") {
    return (
      <HQAdminLayout>
        <PageLoader title="Chargement du dashboard HQ Admin..." />
      </HQAdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <HQAdminLayout>
        <PageError title="Erreur" description={error} />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Magasins" value={stats?.totalShops} icon="🏪" tone="blue" />
          <StatsCard label="Livraisons aujourd'hui" value={stats?.todayDeliveries} icon="🚚" tone="green" />
          <StatsCard label="Revenus cumulés" value={stats?.totalRevenue} icon="💰" tone="purple" variant="currency" />
          <StatsCard label="Magasins actifs" value={stats?.activeShops} icon="✅" tone="orange" />
        </div>

        {/* Quick actions */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </section>

        {/* Highlights */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-green-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Revenus / magasin</p>
            <p className="mt-2 text-3xl font-bold text-green-900">{formatCurrency(avgRevenuePerShop)}</p>
            <p className="text-xs text-green-800">Moyenne sur l&apos;ensemble du réseau</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Livraisons totales</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{stats?.totalDeliveries ?? 0}</p>
            <p className="text-xs text-blue-700">Depuis le début du mois</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Réseau actif</p>
            <p className="mt-2 text-3xl font-bold text-purple-900">
              {stats?.regions ? stats.regions.length : 0} régions
            </p>
            <p className="text-xs text-purple-800">Performance consolidée</p>
          </div>
        </section>

        {/* Regions Overview */}
        {stats?.regions && stats.regions.length > 0 && (
          <RegionList
            title="Performance par région"
            regions={stats.regions.map((region, idx) => ({
              id: String(idx),
              name: region.name,
              shops: region.shops,
              deliveries: region.deliveries,
              revenue: region.revenue,
            }))}
          />
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
                          {formatDateLabel(delivery.date)}
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

