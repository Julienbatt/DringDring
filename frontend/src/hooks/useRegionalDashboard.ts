"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiAuthGet } from "@/lib/api";

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
  status: "active" | "inactive";
};

type Delivery = {
  id: string;
  shopId: string;
  date: string;
  totalAmount: number;
};

type RawShop = {
  id: string;
  name: string;
  chain?: string;
};

type UseRegionalDashboardParams = {
  enabled: boolean;
  regionId?: string;
};

export function useRegionalDashboard(params: UseRegionalDashboardParams) {
  const { enabled, regionId } = params;
  const [stats, setStats] = useState<RegionalStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestIdRef = useRef(0);

  const computeStats = useCallback((deliveries: Delivery[], shopCount: number): RegionalStats => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    let totalRevenue = 0;
    let weekDeliveries = 0;
    let weekRevenue = 0;

    for (const d of deliveries) {
      const amount = Number(d.totalAmount) || 0;
      totalRevenue += amount;
      const ts = Date.parse(d.date);
      if (!Number.isNaN(ts) && ts >= weekAgo) {
        weekDeliveries += 1;
        weekRevenue += amount;
      }
    }

    return {
      totalShops: shopCount,
      totalDeliveries: deliveries.length,
      totalRevenue,
      activeCouriers: Math.max(3, Math.round(shopCount / 2)), // placeholder
      thisWeekDeliveries: weekDeliveries,
      thisWeekRevenue: weekRevenue,
    };
  }, []);

  const computeShops = useCallback((deliveries: Delivery[], rawShops: RawShop[]): Shop[] => {
    const revenueByShop: Record<string, number> = {};
    const deliveriesByShop: Record<string, number> = {};
    const lastDeliveryByShop: Record<string, number> = {};
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const activeWithinWeek: Record<string, boolean> = {};

    for (const delivery of deliveries) {
      const shopId = delivery.shopId;
      if (!shopId) continue;
      const amount = Number(delivery.totalAmount) || 0;
      revenueByShop[shopId] = (revenueByShop[shopId] || 0) + amount;
      deliveriesByShop[shopId] = (deliveriesByShop[shopId] || 0) + 1;
      const ts = Date.parse(delivery.date);
      if (!Number.isNaN(ts)) {
        if (!lastDeliveryByShop[shopId] || ts > lastDeliveryByShop[shopId]) {
          lastDeliveryByShop[shopId] = ts;
        }
        if (ts >= sevenDaysAgo) {
          activeWithinWeek[shopId] = true;
        }
      }
    }

    return rawShops
      .map((shop) => {
        const lastTs = lastDeliveryByShop[shop.id];
        return {
          id: shop.id,
          name: shop.name || "Shop sans nom",
          chain: shop.chain || "Autre",
          deliveries: deliveriesByShop[shop.id] || 0,
          revenue: revenueByShop[shop.id] || 0,
          lastDelivery: lastTs ? new Date(lastTs).toISOString() : "",
          status: activeWithinWeek[shop.id] ? "active" : "inactive",
        } as Shop;
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!enabled || !regionId) return;
      const requestId = ++requestIdRef.current;
      setError(null);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [deliveriesData, shopsData] = await Promise.all([
          apiAuthGet<Delivery[]>(`/test/regional/deliveries?regionId=${encodeURIComponent(regionId)}`),
          apiAuthGet<RawShop[]>(`/test/regional/shops?regionId=${encodeURIComponent(regionId)}`),
        ]);
        if (requestId !== requestIdRef.current) return;
        setStats(computeStats(deliveriesData, shopsData.length));
        setShops(computeShops(deliveriesData, shopsData));
        setLastUpdated(new Date());
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError("Impossible de charger les données régionales.");
        }
        console.error("regional-dashboard", err);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [computeShops, computeStats, enabled, regionId],
  );

  useEffect(() => {
    if (!enabled || !regionId) {
      setStats(null);
      setShops([]);
      setLastUpdated(null);
      setError(regionId ? null : "Aucune région associée à ce compte.");
      return;
    }
    load();
  }, [enabled, regionId, load]);

  return {
    stats,
    shops,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => load(true),
  };
}



