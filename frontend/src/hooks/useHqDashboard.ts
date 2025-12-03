"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHqDashboard } from "@/lib/data/hqDashboard";

type DashboardData = Awaited<ReturnType<typeof fetchHqDashboard>>;

type UseHqDashboardParams = {
  enabled: boolean;
  chainId?: string;
};

export function useHqDashboard(params: UseHqDashboardParams) {
  const { enabled, chainId } = params;
  const [stats, setStats] = useState<DashboardData["stats"] | null>(null);
  const [regions, setRegions] = useState<DashboardData["regions"]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestId = useRef(0);

  const reset = useCallback(() => {
    requestId.current += 1;
    setStats(null);
    setRegions([]);
    setLoading(false);
    setRefreshing(false);
    setError(null);
    setLastUpdated(null);
  }, []);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!enabled || !chainId) {
        reset();
        return;
      }
      const nextId = requestId.current + 1;
      requestId.current = nextId;
      setError(null);
      setRefreshing(Boolean(opts.silent));
      setLoading((prev) => (opts.silent ? prev : true));
      try {
        const data = await fetchHqDashboard({ chainId });
        if (requestId.current !== nextId) return;
        setStats(data.stats);
        setRegions(data.regions);
        setLastUpdated(new Date());
      } catch (err) {
        if (requestId.current !== nextId) return;
        setError("Impossible de charger le tableau de bord HQ.");
        if (process.env.NODE_ENV !== "production") {
          console.error("hq-dashboard:load", err);
        }
      } finally {
        if (requestId.current === nextId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [chainId, enabled, reset],
  );

  useEffect(() => {
    if (!enabled || !chainId) {
      reset();
      return;
    }
    load();
  }, [chainId, enabled, load, reset]);

  return {
    stats,
    regions,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => load({ silent: true }),
  };
}

