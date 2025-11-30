"use client";
import { useEffect, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";

type ReportData = {
  period: string;
  totalDeliveries: number;
  totalRevenue: number;
  averageOrderValue: number;
  topShops: Array<{
    name: string;
    deliveries: number;
    revenue: number;
  }>;
  deliveriesByDay: Array<{
    date: string;
    deliveries: number;
    revenue: number;
  }>;
  deliveriesByRegion: Array<{
    region: string;
    deliveries: number;
    revenue: number;
  }>;
};

export default function HQAdminReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [periodData, allDeliveriesData] = await Promise.all([
          apiAuthGet<ReportData>(`/test/hq-admin/reports/${selectedPeriod}`),
          apiAuthGet<any[]>("/test/hq-admin/deliveries")
        ]);
        
        // Calculer les rapports en temps réel
        const calculatedReports = calculateRealTimeReports(allDeliveriesData, selectedPeriod);
        setReportData(calculatedReports);
      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des rapports.");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [selectedPeriod]);

  const calculateRealTimeReports = (deliveries: any[], period: string): ReportData => {
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
    const totalRevenue = periodDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    const averageOrderValue = totalDeliveries > 0 ? totalRevenue / totalDeliveries : 0;

    // Top magasins
    const shopStats = periodDeliveries.reduce((acc, d) => {
      const shopName = d.shopName;
      if (!acc[shopName]) {
        acc[shopName] = { deliveries: 0, revenue: 0 };
      }
      acc[shopName].deliveries += 1;
      acc[shopName].revenue += d.totalAmount;
      return acc;
    }, {} as Record<string, { deliveries: number; revenue: number }>);

    const topShops = (Object.entries(shopStats) as [string, { deliveries: number; revenue: number }][])
      .map(([name, data]) => ({ name, deliveries: data.deliveries, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Livraisons par jour
    const deliveriesByDay = periodDeliveries.reduce((acc, d) => {
      const date = new Date(d.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { deliveries: 0, revenue: 0 };
      }
      acc[date].deliveries += 1;
      acc[date].revenue += d.totalAmount;
      return acc;
    }, {} as Record<string, { deliveries: number; revenue: number }>);

    const deliveriesByDayArray = (Object.entries(deliveriesByDay) as [string, { deliveries: number; revenue: number }][])
      .map(([date, data]) => ({ date, deliveries: data.deliveries, revenue: data.revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Livraisons par région
    const regionStats = periodDeliveries.reduce((acc, d) => {
      const region = d.region || 'Non défini';
      if (!acc[region]) {
        acc[region] = { deliveries: 0, revenue: 0 };
      }
      acc[region].deliveries += 1;
      acc[region].revenue += d.totalAmount;
      return acc;
    }, {} as Record<string, { deliveries: number; revenue: number }>);

    const deliveriesByRegion = (Object.entries(regionStats) as [string, { deliveries: number; revenue: number }][])
      .map(([region, data]) => ({ region, deliveries: data.deliveries, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period,
      totalDeliveries,
      totalRevenue,
      averageOrderValue,
      topShops,
      deliveriesByDay: deliveriesByDayArray,
      deliveriesByRegion
    };
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

  if (loading) {
    return (
      <HQAdminLayout>
        <LoadingSpinner text="Chargement des rapports..." />
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytics</h1>
            <p className="mt-2 text-gray-600">
              Analyse des performances de vos magasins
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              📊 Exporter PDF
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              📈 Exporter Excel
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
                      ? 'bg-purple-100 text-purple-700'
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
                      {reportData?.totalDeliveries || 0}
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
                    <dd className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData?.totalRevenue || 0)}
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
                      Panier Moyen
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData?.averageOrderValue || 0)}
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
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Croissance
                    </dt>
                    <dd className="text-2xl font-bold text-green-600">
                      +12.5%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Shops */}
        {reportData?.topShops && reportData.topShops.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Top Magasins
              </h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rang
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Magasin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Livraisons
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.topShops.map((shop, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {shop.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {shop.deliveries}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(shop.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Performance by Region */}
        {reportData?.deliveriesByRegion && reportData.deliveriesByRegion.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Performance par Région
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reportData.deliveriesByRegion.map((region, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {region.region}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Livraisons: {region.deliveries}</p>
                      <p>Revenus: {formatCurrency(region.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Daily Performance */}
        {reportData?.deliveriesByDay && reportData.deliveriesByDay.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Performance Quotidienne
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Livraisons
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.deliveriesByDay.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.deliveries}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(day.revenue)}
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
    </HQAdminLayout>
  );
}

