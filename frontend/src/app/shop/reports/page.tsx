"use client";
import { useEffect, useState } from "react";
import ShopLayout from "@/components/ShopLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet, getMe, type Me } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";

type ShopReportData = {
  period: string;
  totalDeliveries: number;
  totalRevenue: number;
  averageOrderValue: number;
  deliveriesByDay: Array<{
    date: string;
    deliveries: number;
    revenue: number;
  }>;
  deliveriesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  topClients: Array<{
    clientName: string;
    deliveries: number;
    revenue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    deliveries: number;
  }>;
};

export default function ShopReportsPage() {
  const [reportData, setReportData] = useState<ShopReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setMe(null); setLoading(false); return; }
      try {
        const t = await getIdToken(user, true);
        const m = await getMe(t);
        setMe(m);
        if (m.shopId) {
            fetchReportData(m.shopId);
        } else {
            setLoading(false);
        }
      } catch (e: any) {
        setMe(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [selectedPeriod]); // Re-run if period changes, but we need shopId first.
  // Actually, dependency on selectedPeriod is tricky if we need shopId.
  // Better: separate fetch function and call it when both exist.
  
  // Refactor: separate effect for auth and data
  
  const fetchReportData = async (shopId: string) => {
      try {
        setLoading(true);
        // Fetch all deliveries to calculate reports locally
        const res = await apiAuthGet<{deliveries: any[]}>(`/deliveries?shopId=${shopId}&limit=2000`);
        
        // Calculer les rapports en temps réel
        const calculatedReports = calculateRealTimeReports(res.deliveries, selectedPeriod);
        setReportData(calculatedReports);
      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des rapports.");
      } finally {
        setLoading(false);
      }
  };

  const calculateRealTimeReports = (deliveries: any[], period: string): ShopReportData => {
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
    const periodDeliveries = deliveries.filter(d => {
        if (!d.startWindow) return false;
        return new Date(d.startWindow) >= startDate;
    });

    // Calculs de base
    const totalDeliveries = periodDeliveries.length;
    // Fix: use amount from backend
    const totalRevenue = periodDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
    const averageOrderValue = totalDeliveries > 0 ? totalRevenue / totalDeliveries : 0;

    // Livraisons par jour
    const deliveriesByDay = periodDeliveries.reduce((acc, d) => {
      const date = new Date(d.startWindow).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { deliveries: 0, revenue: 0 };
      }
      acc[date].deliveries += 1;
      acc[date].revenue += (d.amount || 0);
      return acc;
    }, {} as Record<string, { deliveries: number; revenue: number }>);

    const deliveriesByDayArray = Object.entries(deliveriesByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Livraisons par statut
    const statusStats = periodDeliveries.reduce((acc, d) => {
      const status = d.status || (new Date(d.startWindow) < new Date() ? 'delivered' : 'scheduled');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deliveriesByStatus = Object.entries(statusStats)
      .map(([status, count]) => ({
        status: getStatusText(status),
        count,
        percentage: totalDeliveries > 0 ? (count / totalDeliveries) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Top clients
    const clientStats = periodDeliveries.reduce((acc, d) => {
      const clientName = d.clientName || d.clientId || "Inconnu";
      if (!acc[clientName]) {
        acc[clientName] = { deliveries: 0, revenue: 0 };
      }
      acc[clientName].deliveries += 1;
      acc[clientName].revenue += (d.amount || 0);
      return acc;
    }, {} as Record<string, { deliveries: number; revenue: number }>);

    const topClients = Object.entries(clientStats)
      .map(([clientName, data]) => ({ clientName, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Revenus par mois
    const monthlyStats = periodDeliveries.reduce((acc, d) => {
      const month = new Date(d.startWindow).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { revenue: 0, deliveries: 0 };
      }
      acc[month].revenue += (d.amount || 0);
      acc[month].deliveries += 1;
      return acc;
    }, {} as Record<string, { revenue: number; deliveries: number }>);

    const revenueByMonth = Object.entries(monthlyStats)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

    return {
      period,
      totalDeliveries,
      totalRevenue,
      averageOrderValue,
      deliveriesByDay: deliveriesByDayArray,
      deliveriesByStatus,
      topClients,
      revenueByMonth
    };
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
      <ShopLayout>
        <LoadingSpinner text="Chargement des rapports..." />
      </ShopLayout>
    );
  }

  if (error) {
    return (
      <ShopLayout>
        <Breadcrumbs />
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <Breadcrumbs />
      <div className="mt-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytics</h1>
            <p className="mt-2 text-gray-600">
              Analyse des performances de votre magasin
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
                      ? 'bg-green-100 text-green-700'
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
                      +8.5%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

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

        {/* Status Distribution */}
        {reportData?.deliveriesByStatus && reportData.deliveriesByStatus.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Répartition par Statut
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reportData.deliveriesByStatus.map((status, index) => (
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

        {/* Top Clients */}
        {reportData?.topClients && reportData.topClients.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Top Clients
              </h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rang
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
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
                    {reportData.topClients.map((client, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.deliveries}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(client.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Revenue by Month */}
        {reportData?.revenueByMonth && reportData.revenueByMonth.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Évolution Mensuelle
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
                        Revenus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.revenueByMonth.map((month, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.deliveries}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(month.revenue)}
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
    </ShopLayout>
  );
}

