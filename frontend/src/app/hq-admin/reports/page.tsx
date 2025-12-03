"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { parseISO, startOfMonth, startOfQuarter, startOfYear, subDays } from "date-fns";

type Period = "week" | "month" | "quarter" | "year";

type DeliveryRecord = {
  id: string;
  date: string;
  shopName: string;
  totalAmount: number;
  region?: string;
};

type NormalizedDelivery = DeliveryRecord & {
  dateValue: Date;
};

type ReportData = {
  period: Period;
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

const PERIOD_CONFIG: Record<
  Period,
  {
    label: string;
    getStart: (now: Date) => Date;
  }
> = {
  week: {
    label: "Cette semaine",
    getStart: (now) => subDays(now, 6),
  },
  month: {
    label: "Ce mois",
    getStart: (now) => startOfMonth(now),
  },
  quarter: {
    label: "Ce trimestre",
    getStart: (now) => startOfQuarter(now),
  },
  year: {
    label: "Cette année",
    getStart: (now) => startOfYear(now),
  },
};

const normalizeDelivery = (delivery: DeliveryRecord): NormalizedDelivery => ({
  ...delivery,
  dateValue: safeParseDate(delivery.date),
});

const safeParseDate = (value: string) => {
  try {
    const normalized = value?.includes("T") ? value : `${value ?? ""}T00:00:00Z`;
    return parseISO(normalized);
  } catch {
    return new Date(0);
  }
};

const buildReport = (deliveries: NormalizedDelivery[], period: Period): ReportData => {
  const now = new Date();
  const startDate = PERIOD_CONFIG[period].getStart(now);
  const scoped = deliveries.filter((delivery) => delivery.dateValue >= startDate);

  const totals = scoped.reduce(
    (acc, delivery) => {
      acc.totalDeliveries += 1;
      acc.totalRevenue += delivery.totalAmount;
      return acc;
    },
    { totalDeliveries: 0, totalRevenue: 0 },
  );

  const shopMap = new Map<string, { deliveries: number; revenue: number }>();
  const regionMap = new Map<string, { deliveries: number; revenue: number }>();
  const dayMap = new Map<string, { deliveries: number; revenue: number }>();

  scoped.forEach((delivery) => {
    const regionKey = delivery.region ?? "Non défini";
    const dayKey = delivery.dateValue.toISOString().split("T")[0];

    const shopStats = shopMap.get(delivery.shopName) ?? { deliveries: 0, revenue: 0 };
    shopStats.deliveries += 1;
    shopStats.revenue += delivery.totalAmount;
    shopMap.set(delivery.shopName, shopStats);

    const regionStats = regionMap.get(regionKey) ?? { deliveries: 0, revenue: 0 };
    regionStats.deliveries += 1;
    regionStats.revenue += delivery.totalAmount;
    regionMap.set(regionKey, regionStats);

    const dayStats = dayMap.get(dayKey) ?? { deliveries: 0, revenue: 0 };
    dayStats.deliveries += 1;
    dayStats.revenue += delivery.totalAmount;
    dayMap.set(dayKey, dayStats);
  });

  const topShops = Array.from(shopMap.entries())
    .map(([name, data]) => ({
      name,
      deliveries: data.deliveries,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const deliveriesByRegion = Array.from(regionMap.entries())
    .map(([region, data]) => ({
      region,
      deliveries: data.deliveries,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const deliveriesByDay = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      deliveries: data.deliveries,
      revenue: data.revenue,
    }))
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

  return {
    period,
    totalDeliveries: totals.totalDeliveries,
    totalRevenue: totals.totalRevenue,
    averageOrderValue:
      totals.totalDeliveries > 0 ? totals.totalRevenue / totals.totalDeliveries : 0,
    topShops,
    deliveriesByDay,
    deliveriesByRegion,
  };
};

type MetricCardProps = {
  icon: string;
  label: string;
  value: ReactNode;
  accent?: string;
  subtitle?: ReactNode;
};

const MetricCard = ({ icon, label, value, accent = "text-gray-500", subtitle }: MetricCardProps) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center gap-4">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? <p className={`mt-1 text-sm ${accent}`}>{subtitle}</p> : null}
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="bg-white shadow rounded-lg p-8 text-center">
    <p className="text-lg font-medium text-gray-900">Aucune donnée pour cette période</p>
    <p className="mt-2 text-gray-500">
      Ajoutez des livraisons ou choisissez une autre période pour afficher des statistiques.
    </p>
  </div>
);

export default function HQAdminReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [deliveries, setDeliveries] = useState<NormalizedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAuthGet<DeliveryRecord[]>("/test/hq-admin/deliveries");
      setDeliveries((data ?? []).map(normalizeDelivery));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les rapports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDeliveries();
  }, [fetchDeliveries]);

  const reportData = useMemo(
    () => buildReport(deliveries, selectedPeriod),
    [deliveries, selectedPeriod],
  );

  const hasDataset =
    reportData.totalDeliveries > 0 ||
    reportData.topShops.length > 0 ||
    reportData.deliveriesByDay.length > 0 ||
    reportData.deliveriesByRegion.length > 0;

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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytics</h1>
            <p className="mt-2 text-gray-600">Analyse des performances de vos magasins</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void fetchDeliveries()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              🔄 Actualiser
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              📊 Exporter PDF
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              📈 Exporter Excel
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PERIOD_CONFIG) as Period[]).map((periodKey) => (
                <button
                  key={periodKey}
                  onClick={() => setSelectedPeriod(periodKey)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedPeriod === periodKey
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {PERIOD_CONFIG[periodKey].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon="🚚" label="Total livraisons" value={reportData.totalDeliveries} />
          <MetricCard
            icon="💰"
            label="Revenus totaux"
            value={formatCurrency(reportData.totalRevenue)}
          />
          <MetricCard
            icon="📊"
            label="Panier moyen"
            value={formatCurrency(reportData.averageOrderValue)}
          />
          <MetricCard
            icon="📈"
            label="Croissance"
            value="+12.5%"
            accent="text-green-600"
            subtitle="Par rapport à la période précédente"
          />
        </div>

        {hasDataset ? (
          <>
            {reportData.topShops.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Top magasins</h3>
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Rang", "Magasin", "Livraisons", "Revenus"].map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.topShops.map((shop, index) => (
                          <tr key={shop.name} className="hover:bg-gray-50">
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

            {reportData.deliveriesByRegion.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance par région</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reportData.deliveriesByRegion.map((region) => (
                      <div key={region.region} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">{region.region}</h4>
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

            {reportData.deliveriesByDay.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance quotidienne</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Date", "Livraisons", "Revenus"].map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.deliveriesByDay.map((day) => (
                          <tr key={day.date} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatShortDate(day.date)}
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
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </HQAdminLayout>
  );
}
