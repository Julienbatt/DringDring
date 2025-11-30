"use client";
import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";
import { showToast } from "@/lib/toast";

type ClientStatsData = {
  period: string;
  totalDeliveries: number;
  totalSpent: number;
  averageOrderValue: number;
  deliveriesByMonth: Array<{
    month: string;
    deliveries: number;
    spent: number;
  }>;
  deliveriesByShop: Array<{
    shopName: string;
    deliveries: number;
    spent: number;
    percentage: number;
  }>;
  deliveriesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  spendingTrend: Array<{
    period: string;
    amount: number;
  }>;
  favoriteShop: {
    name: string;
    deliveries: number;
    spent: number;
  };
  savings: {
    total: number;
    description: string;
  };
};

export default function ClientStatsPage() {
  const [statsData, setStatsData] = useState<ClientStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        setLoading(true);
        const [periodData, allDeliveriesData] = await Promise.all([
          apiAuthGet<ClientStatsData>(`/test/client/stats/${selectedPeriod}`),
          apiAuthGet<any[]>("/test/client/deliveries")
        ]);
        
        // Calculer les statistiques en temps réel
        const calculatedStats = calculateRealTimeStats(allDeliveriesData, selectedPeriod);
        setStatsData(calculatedStats);
      } catch (err: any) {
        console.error("Error fetching stats data:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des statistiques.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatsData();
  }, [selectedPeriod]);

  const calculateRealTimeStats = (deliveries: any[], period: string): ClientStatsData => {
    const now = new Date();
    let startDate: Date;
    
    // Déterminer la période
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    // Filtrer les livraisons selon la période
    const periodDeliveries = deliveries.filter(d => 
      new Date(d.date) >= startDate
    );

    // Calculs de base
    const totalDeliveries = periodDeliveries.length;
    const totalSpent = periodDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    const averageOrderValue = totalDeliveries > 0 ? totalSpent / totalDeliveries : 0;

    // Calculs par magasin
    const shopStats = periodDeliveries.reduce((acc, d) => {
      const shop = d.shopName;
      if (!acc[shop]) {
        acc[shop] = { deliveries: 0, spent: 0 };
      }
      acc[shop].deliveries += 1;
      acc[shop].spent += d.totalAmount;
      return acc;
    }, {} as Record<string, { deliveries: number; spent: number }>);

    const deliveriesByShop = (Object.entries(shopStats) as [string, { deliveries: number; spent: number }][])
      .map(([shopName, data]) => ({
        shopName,
        deliveries: data.deliveries,
        spent: data.spent,
        percentage: totalDeliveries > 0 ? (data.deliveries / totalDeliveries) * 100 : 0
      }))
      .sort((a, b) => b.deliveries - a.deliveries);

    // Magasin préféré
    const favoriteShop = deliveriesByShop.length > 0 ? {
      name: deliveriesByShop[0].shopName,
      deliveries: deliveriesByShop[0].deliveries,
      spent: deliveriesByShop[0].spent
    } : { name: "Aucun", deliveries: 0, spent: 0 };

    // Calculs par statut
    const statusStats = periodDeliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deliveriesByStatus = (Object.entries(statusStats) as [string, number][])
      .map(([status, count]) => ({
        status: getStatusText(status as any),
        count,
        percentage: totalDeliveries > 0 ? (count / totalDeliveries) * 100 : 0
      }));

    // Calculs mensuels
    const monthlyStats = periodDeliveries.reduce((acc, d) => {
      const month = new Date(d.date).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { deliveries: 0, spent: 0 };
      }
      acc[month].deliveries += 1;
      acc[month].spent += d.totalAmount;
      return acc;
    }, {} as Record<string, { deliveries: number; spent: number }>);

    const deliveriesByMonth = (Object.entries(monthlyStats) as [string, { deliveries: number; spent: number }][])
      .map(([month, data]) => ({ month, deliveries: data.deliveries, spent: data.spent }))
      .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

    // Tendance des dépenses (par semaine)
    const weeklySpending = periodDeliveries.reduce((acc, d) => {
      const week = getWeekNumber(new Date(d.date));
      if (!acc[week]) {
        acc[week] = 0;
      }
      acc[week] += d.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    const spendingTrend = (Object.entries(weeklySpending) as [string, number][])
      .map(([week, amount]) => ({ period: `Semaine ${week}`, amount }))
      .sort((a, b) => parseInt(a.period.split(' ')[1]) - parseInt(b.period.split(' ')[1]));

    // Calcul des économies (estimation)
    const estimatedSavings = totalSpent * 0.15; // 15% d'économies estimées

    return {
      period,
      totalDeliveries,
      totalSpent,
      averageOrderValue,
      deliveriesByMonth,
      deliveriesByShop,
      deliveriesByStatus,
      spendingTrend,
      favoriteShop,
      savings: {
        total: estimatedSavings,
        description: "Économies estimées grâce aux livraisons groupées et aux tarifs préférentiels"
      }
    };
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered': return 'Livrées';
      case 'confirmed': return 'Confirmées';
      case 'scheduled': return 'Programmées';
      case 'in_progress': return 'En cours';
      case 'cancelled': return 'Annulées';
      default: return status;
    }
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
      month: 'short'
    });
  };

  const exportToPDF = () => {
    showToast("Export PDF en cours de développement", "info");
  };

  const exportToExcel = () => {
    showToast("Export Excel en cours de développement", "info");
  };

  if (loading) {
    return (
      <ClientLayout>
        <LoadingSpinner text="Chargement de vos statistiques..." />
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <Breadcrumbs />
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Breadcrumbs />
      <div className="mt-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Statistiques</h1>
            <p className="mt-2 text-gray-600">
              Analyse de vos habitudes de livraison et de vos économies
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={exportToPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              📄 Export PDF
            </button>
            <button 
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              📊 Export Excel
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex space-x-4">
              {[
                { key: 'week', label: 'Cette semaine' },
                { key: 'month', label: 'Ce mois' },
                { key: 'quarter', label: 'Ce trimestre' },
                { key: 'year', label: 'Cette année' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedPeriod(key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedPeriod === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚚</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Livraisons
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {statsData?.totalDeliveries || 0}
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
                      Total Dépensé
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {formatCurrency(statsData?.totalSpent || 0)}
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
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Commande Moyenne
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {formatCurrency(statsData?.averageOrderValue || 0)}
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
                  <span className="text-2xl">💚</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Économies
                    </dt>
                    <dd className="text-2xl font-bold text-green-600">
                      {formatCurrency(statsData?.savings?.total || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite Shop */}
        {statsData?.favoriteShop && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-4xl">⭐</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Votre magasin préféré
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {statsData.favoriteShop.name}
                </p>
                <p className="text-sm text-gray-600">
                  {statsData.favoriteShop.deliveries} livraisons • {formatCurrency(statsData.favoriteShop.spent)} dépensés
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Savings Info */}
        {statsData?.savings && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-4xl">🌱</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Votre impact environnemental
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(statsData.savings.total)} économisés
                </p>
                <p className="text-sm text-gray-600">
                  {statsData.savings.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Performance */}
        {statsData?.deliveriesByMonth && statsData.deliveriesByMonth.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Performance Mensuelle
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mois
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Livraisons
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dépensé
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statsData.deliveriesByMonth.map((month, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.deliveries}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(month.spent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Shop Distribution */}
        {statsData?.deliveriesByShop && statsData.deliveriesByShop.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Répartition par Magasin
              </h3>
              <div className="space-y-4">
                {statsData.deliveriesByShop.map((shop, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {shop.shopName}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {shop.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <p>{shop.deliveries} livraisons</p>
                      <p>{formatCurrency(shop.spent)}</p>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${shop.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Distribution */}
        {statsData?.deliveriesByStatus && statsData.deliveriesByStatus.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Répartition par Statut
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statsData.deliveriesByStatus.map((status, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {status.status}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Quantité: {status.count}</p>
                      <p>Pourcentage: {status.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spending Trend */}
        {statsData?.spendingTrend && statsData.spendingTrend.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Évolution des Dépenses
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statsData.spendingTrend.map((trend, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(trend.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

