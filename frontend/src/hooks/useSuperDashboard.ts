"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiAuthGet } from "@/lib/api";

export type SuperAdminStats = {
  totalUsers: number;
  totalShops: number;
  totalDeliveries: number;
  totalRevenue: number;
  activeRegions: number;
  totalChains: number;
  systemHealth: "excellent" | "good" | "warning" | "critical";
};

export type SystemAlert = {
  id: string;
  type: "info" | "warning" | "error";
  message: string;
  timestamp: string;
};

type SuperAdminDelivery = {
  id: string;
  date: string;
  region?: string | null;
  totalAmount?: number | null;
  deliveryTime?: number | null;
  status?: string | null;
  slaBreached?: boolean;
  shopId?: string | null;
};

type SuperAdminShop = {
  id: string;
  region?: string | null;
  chainId?: string | null;
  chainName?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type SuperAdminUser = {
  uid: string;
  createdAt?: string | null;
  roles?: string[];
  status?: string | null;
};

type ChainPerformance = {
  chainId: string;
  chainName: string;
  deliveries: number;
  shops: number;
  revenue: number;
};

type RegionPerformance = {
  region: string;
  deliveries: number;
  shops: number;
  revenue: number;
};

type SuperDashboardData = {
  stats: SuperAdminStats;
  alerts: SystemAlert[];
  chains: ChainPerformance[];
  regions: RegionPerformance[];
};

const DEFAULT_STATS: SuperAdminStats = {
  totalUsers: 0,
  totalShops: 0,
  totalDeliveries: 0,
  totalRevenue: 0,
  activeRegions: 0,
  totalChains: 0,
  systemHealth: "excellent",
};

const MS_PER_HOUR = 60 * 60 * 1000;

type UseSuperDashboardParams = {
  enabled: boolean;
};

export function useSuperDashboard({ enabled }: UseSuperDashboardParams) {
  const [data, setData] = useState<SuperDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      setLastUpdated(null);
      return;
    }
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const [deliveries, shops, users] = await Promise.all([
        apiAuthGet<SuperAdminDelivery[]>("/test/super-admin/deliveries"),
        apiAuthGet<SuperAdminShop[]>("/test/super-admin/shops"),
        apiAuthGet<SuperAdminUser[]>("/test/super-admin/users"),
      ]);

      if (currentRequestId !== requestIdRef.current) return;

      const stats = calculateStats(deliveries, shops, users);
      const alerts = generateAlerts(deliveries, shops, users, stats);
      const chains = buildChainPerformance(deliveries, shops);
      const regions = buildRegionPerformance(deliveries, shops);

      setData({ stats, alerts, chains, regions });
      setLastUpdated(new Date());
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError((err as { message?: string })?.message || "Erreur de chargement des données super admin.");
        setData(null);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, lastUpdated, refresh: loadData };
}

function calculateStats(
  deliveries: SuperAdminDelivery[],
  shops: SuperAdminShop[],
  users: SuperAdminUser[]
): SuperAdminStats {
  if (!deliveries.length && !shops.length && !users.length) {
    return DEFAULT_STATS;
  }

  const now = Date.now();
  const lastDayCutoff = now - 24 * MS_PER_HOUR;
  const lastMonthCutoff = now - 30 * 24 * MS_PER_HOUR;

  const totalRevenue = deliveries.reduce((sum, delivery) => sum + (delivery.totalAmount ?? 0), 0);
  const totalDeliveries = deliveries.length;
  const totalUsers = users.length;
  const totalShops = shops.length;

  const activeRegions = new Set(
    deliveries
      .filter((delivery) => {
        const deliveryDate = new Date(delivery.date).getTime();
        return Number.isFinite(deliveryDate) && deliveryDate >= lastMonthCutoff;
      })
      .map((delivery) => delivery.region)
      .filter(Boolean)
  ).size;

  const totalChains = new Set(
    shops
      .map((shop) => shop.chainId || shop.chainName)
      .filter(Boolean)
  ).size;

  const deliveriesIn24h = deliveries.filter((delivery) => {
    const deliveryDate = new Date(delivery.date).getTime();
    return Number.isFinite(deliveryDate) && deliveryDate >= lastDayCutoff;
  });

  const averageDeliveryTime = totalDeliveries
    ? deliveries.reduce((sum, delivery) => sum + (delivery.deliveryTime ?? 30), 0) / totalDeliveries
    : 0;

  const failedDeliveries = deliveries.filter((delivery) =>
    ["failed", "cancelled", "canceled"].includes((delivery.status || "").toLowerCase())
  ).length;
  const failureRate = totalDeliveries ? failedDeliveries / totalDeliveries : 0;

  const slaBreaches =
    deliveries.filter((delivery) => delivery.slaBreached || (delivery.deliveryTime ?? 0) > 45).length /
    (totalDeliveries || 1);

  const inactiveShopRatio =
    totalShops > 0 ? shops.filter((shop) => (shop.status || "active") !== "active").length / totalShops : 0;

  return {
    totalUsers,
    totalShops,
    totalDeliveries,
    totalRevenue,
    totalChains,
    activeRegions,
    systemHealth: deriveSystemHealth({
      deliveriesIn24h: deliveriesIn24h.length,
      failureRate,
      averageDeliveryTime,
      slaBreaches,
      inactiveShopRatio,
    }),
  };
}

function buildChainPerformance(deliveries: SuperAdminDelivery[], shops: SuperAdminShop[]): ChainPerformance[] {
  const map = new Map<string, ChainPerformance>();
  const shopIndex = new Map(shops.map((shop) => [shop.id, shop]));

  for (const shop of shops) {
    const chainId = shop.chainId || shop.chainName || "Autre";
    if (!map.has(chainId)) {
      map.set(chainId, {
        chainId,
        chainName: shop.chainName || chainId,
        deliveries: 0,
        shops: 0,
        revenue: 0,
      });
    }
    const entry = map.get(chainId)!;
    entry.shops += 1;
  }

  for (const delivery of deliveries) {
    const shop = delivery.shopId ? shopIndex.get(delivery.shopId) : undefined;
    const chainId = shop?.chainId || shop?.chainName || "Autre";
    if (!map.has(chainId)) {
      map.set(chainId, {
        chainId,
        chainName: shop?.chainName || chainId,
        deliveries: 0,
        shops: 0,
        revenue: 0,
      });
    }
    const entry = map.get(chainId)!;
    entry.deliveries += 1;
    entry.revenue += Number(delivery.totalAmount) || 0;
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildRegionPerformance(deliveries: SuperAdminDelivery[], shops: SuperAdminShop[]): RegionPerformance[] {
  const map = new Map<string, RegionPerformance>();
  const shopsByRegion = new Map<string, number>();

  for (const shop of shops) {
    const region = shop.region || "Inconnue";
    shopsByRegion.set(region, (shopsByRegion.get(region) || 0) + 1);
  }

  for (const delivery of deliveries) {
    const region = delivery.region || "Inconnue";
    if (!map.has(region)) {
      map.set(region, {
        region,
        deliveries: 0,
        revenue: 0,
        shops: shopsByRegion.get(region) || 0,
      });
    }
    const entry = map.get(region)!;
    entry.deliveries += 1;
    entry.revenue += Number(delivery.totalAmount) || 0;
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function deriveSystemHealth(metrics: {
  deliveriesIn24h: number;
  failureRate: number;
  averageDeliveryTime: number;
  slaBreaches: number;
  inactiveShopRatio: number;
}): SuperAdminStats["systemHealth"] {
  if (
    metrics.failureRate < 0.01 &&
    metrics.averageDeliveryTime < 32 &&
    metrics.slaBreaches < 0.05 &&
    metrics.inactiveShopRatio < 0.05 &&
    metrics.deliveriesIn24h > 0
  ) {
    return "excellent";
  }

  if (
    metrics.failureRate < 0.03 &&
    metrics.averageDeliveryTime < 40 &&
    metrics.slaBreaches < 0.15 &&
    metrics.inactiveShopRatio < 0.15
  ) {
    return "good";
  }

  if (
    metrics.failureRate < 0.06 &&
    metrics.averageDeliveryTime < 50 &&
    metrics.slaBreaches < 0.25 &&
    metrics.inactiveShopRatio < 0.25
  ) {
    return "warning";
  }

  return "critical";
}

function generateAlerts(
  deliveries: SuperAdminDelivery[],
  shops: SuperAdminShop[],
  users: SuperAdminUser[],
  stats: SuperAdminStats
): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const now = new Date();
  const nowTs = now.toLocaleString("fr-CH");
  const twoHoursAgo = now.getTime() - 2 * MS_PER_HOUR;

  if (stats.totalRevenue >= 250000) {
    alerts.push({
      id: "rev-milestone",
      type: "info",
      message: `Le réseau a généré ${stats.totalRevenue.toLocaleString("fr-CH")} CHF ce mois-ci.`,
      timestamp: nowTs,
    });
  }

  const failureRate = stats.totalDeliveries
    ? deliveries.filter((delivery) => (delivery.status || "").toLowerCase() === "failed").length /
      stats.totalDeliveries
    : 0;
  if (failureRate > 0.05) {
    alerts.push({
      id: "failure-rate",
      type: failureRate > 0.1 ? "error" : "warning",
      message: `Taux d'échec élevé (${(failureRate * 100).toFixed(1)} %).`,
      timestamp: nowTs,
    });
  }

  const slowDeliveries = deliveries.filter((delivery) => (delivery.deliveryTime ?? 0) > 55).length;
  if (slowDeliveries > 0) {
    alerts.push({
      id: "slow-deliveries",
      type: "warning",
      message: `${slowDeliveries} livraisons ont dépassé 55 minutes aujourd'hui.`,
      timestamp: nowTs,
    });
  }

  const inactiveShops = shops.filter((shop) => (shop.status || "active") !== "active");
  if (inactiveShops.length) {
    alerts.push({
      id: "inactive-shops",
      type: "warning",
      message: `${inactiveShops.length} magasins nécessitent une attention (statut inactif).`,
      timestamp: nowTs,
    });
  }

  const newUsers = users.filter((user) => {
    const createdAt = new Date(user.createdAt || "").getTime();
    return Number.isFinite(createdAt) && createdAt >= twoHoursAgo;
  }).length;
  if (newUsers > 0) {
    alerts.push({
      id: "new-users",
      type: "info",
      message: `${newUsers} nouveaux comptes créés sur les 2 dernières heures.`,
      timestamp: nowTs,
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "all-clear",
      type: "info",
      message: "Aucune alerte - tout fonctionne normalement.",
      timestamp: nowTs,
    });
  }

  return alerts.slice(0, 5);
}

