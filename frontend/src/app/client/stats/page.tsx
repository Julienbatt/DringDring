"use client";
import { useEffect, useMemo, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";
import { showToast } from "@/lib/toast";

type ClientDelivery = {
  id: string;
  startWindow: string;
  status: string;
  shopName?: string;
  amount?: number;
};

type StatsData = {
  totalDeliveries: number;
  totalSpent: number;
  averageOrderValue: number;
  deliveriesByShop: Array<{ shopName: string; deliveries: number; spent: number }>;
  deliveriesByStatus: Array<{ status: string; count: number }>;
  spendingTrend: Array<{ label: string; amount: number }>;
};

type Period = "week" | "month" | "quarter" | "year";

export default function ClientStatsPage() {
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await apiAuthGet<ClientDelivery[]>("/client/deliveries");
        setDeliveries(data);
      } catch (err: any) {
        console.error("Error fetching stats", err);
        setError(err.message || "Impossible de charger les statistiques.");
        showToast(err.message || "Impossible de charger les statistiques.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statsData = useMemo(() => {
    if (deliveries.length === 0) {
      return null;
    }
    return calculateStats(deliveries, selectedPeriod);
  }, [deliveries, selectedPeriod]);

  if (loading) {
    return (
      <ClientLayout>
        <LoadingSpinner text="Chargement des statistiques..." />
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <Breadcrumbs />
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      </ClientLayout>
    );
  }

  if (!statsData) {
    return (
      <ClientLayout>
        <Breadcrumbs />
        <div className="mt-6 text-gray-600">
          Pas encore de livraisons à analyser. Lance la première depuis ton magasin partenaire !
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Breadcrumbs />
      <div className="mt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Statistiques</h1>
            <p className="mt-2 text-gray-600">
              Vue consolidée de tes livraisons et dépenses DringDring.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(["week", "month", "quarter", "year"] as Period[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  period === selectedPeriod
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-700"
                }`}
              >
                {labelForPeriod(period)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard title="Livraisons" value={statsData.totalDeliveries} />
          <ReportCard
            title="Dépenses"
            value={new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(
              statsData.totalSpent
            )}
          />
          <ReportCard
            title="Panier moyen"
            value={new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(
              statsData.averageOrderValue
            )}
          />
          <ReportCard title="Magasins suivis" value={statsData.deliveriesByShop.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Magasins les plus utilisés</h2>
            {statsData.deliveriesByShop.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore de données.</p>
            ) : (
              <div className="space-y-3">
                {statsData.deliveriesByShop.map((shop) => (
                  <div key={shop.shopName} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{shop.shopName}</p>
                      <p className="text-sm text-gray-500">
                        {shop.deliveries} livraisons ·{" "}
                        {new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(
                          shop.spent
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h2>
            {statsData.deliveriesByStatus.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore de données.</p>
            ) : (
              <div className="space-y-3">
                {statsData.deliveriesByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <p className="text-gray-700">{statusLabel(item.status)}</p>
                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendance des dépenses</h2>
          {statsData.spendingTrend.length === 0 ? (
            <p className="text-sm text-gray-500">Pas encore de données.</p>
          ) : (
            <div className="space-y-2">
              {statsData.spendingTrend.map((point) => (
                <div key={point.label} className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{point.label}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(
                      point.amount
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}

function calculateStats(deliveries: ClientDelivery[], period: Period): StatsData {
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case "year":
    default:
      startDate = new Date(now.getFullYear(), 0, 1);
  }

  const periodDeliveries = deliveries.filter(
    (d) => new Date(d.startWindow) >= startDate
  );

  const totalDeliveries = periodDeliveries.length;
  const totalSpent = periodDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
  const averageOrderValue = totalDeliveries > 0 ? totalSpent / totalDeliveries : 0;

  const shopAggregates = periodDeliveries.reduce((acc, d) => {
    const key = d.shopName || "Magasin partenaire";
    if (!acc[key]) {
      acc[key] = { deliveries: 0, spent: 0 };
    }
    acc[key].deliveries += 1;
    acc[key].spent += d.amount || 0;
    return acc;
  }, {} as Record<string, { deliveries: number; spent: number }>);

  const deliveriesByShop = Object.entries(shopAggregates)
    .map(([shopName, data]) => ({ shopName, ...data }))
    .sort((a, b) => b.deliveries - a.deliveries);

  const statusAggregates = periodDeliveries.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deliveriesByStatus = Object.entries(statusAggregates).map(([status, count]) => ({
    status,
    count,
  }));

  const weeklyAggregates = periodDeliveries.reduce((acc, d) => {
    const date = new Date(d.startWindow);
    const weekLabel = `Semaine ${getWeekNumber(date)}`;
    acc[weekLabel] = (acc[weekLabel] || 0) + (d.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const spendingTrend = Object.entries(weeklyAggregates).map(([label, amount]) => ({
    label,
    amount,
  }));

  return {
    totalDeliveries,
    totalSpent,
    averageOrderValue,
    deliveriesByShop,
    deliveriesByStatus,
    spendingTrend,
  };
}

function getWeekNumber(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.valueOf() - firstDay.valueOf()) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

function labelForPeriod(period: Period) {
  switch (period) {
    case "week":
      return "7 jours";
    case "month":
      return "Mois";
    case "quarter":
      return "Trimestre";
    case "year":
      return "Année";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "delivered":
      return "Livrée";
    case "in_progress":
      return "En cours";
    case "confirmed":
      return "Confirmée";
    case "cancelled":
      return "Annulée";
    default:
      return "Planifiée";
  }
}

function ReportCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
