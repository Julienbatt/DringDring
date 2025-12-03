"use client";
import { useMemo } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { PageLoader, PageError } from "@/components/loading/PageState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { RegionList } from "@/components/dashboard/RegionList";
import { hqActions } from "@/data/mocks/dashboard";
import { formatCurrency } from "@/lib/formatters";
import { useHqDashboard } from "@/hooks/useHqDashboard";

const PERFORMANCE_LOOKBACK_DAYS = 30;

export default function HqAdminPage() {
  const { user, claims, status } = useProtectedRoute({
    redirectTo: "/login/hq-admin",
    requiredRoles: "hq",
  });
  const chainId = typeof claims?.chainId === "string" ? claims.chainId : null;
  const chainName = typeof claims?.chainName === "string" ? claims.chainName : null;
  const {
    stats,
    regions,
    loading: dashboardLoading,
    error: dashboardError,
    lastUpdated,
    refresh,
    refreshing,
  } = useHqDashboard({ enabled: Boolean(user) && Boolean(chainId), chainId: chainId ?? undefined });

  const showSkeleton = dashboardLoading && !stats;
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return "Jamais synchronisé";
    return lastUpdated.toLocaleString("fr-CH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdated]);

  if (status === "loading" || status === "redirecting") {
    return (
      <Layout>
        <PageLoader title="Chargement du tableau de bord HQ..." />
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  if (!chainId) {
    return (
      <Layout>
        <PageError
          title="Aucune enseigne liée"
          description="Votre compte HQ n'est associé à aucune enseigne. Contactez le support."
          action={
            <button
              type="button"
              onClick={() => refresh()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Réessayer
            </button>
          }
        />
      </Layout>
    );
  }

  if (dashboardError) {
    return (
      <Layout>
        <PageError
          title="Erreur lors du chargement"
          description={dashboardError}
          action={
            <button
              type="button"
              onClick={refresh}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Réessayer
            </button>
          }
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumbs />
        <header className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Administration Enseigne
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Vue d&apos;ensemble {chainName ? chainName : "HQ"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestion globale de votre enseigne et pilotage temps réel.
          </p>
              <p className="mt-1 text-xs text-gray-400">
                Dernière synchronisation : {formattedLastUpdated}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Actualisation..." : "Rafraîchir les données"}
            </button>
          </div>
        </header>

        {showSkeleton ? (
          <DashboardSkeleton />
        ) : (
          <>
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard label="Magasins" value={stats?.totalShops ?? "—"} icon="🏪" tone="blue" />
          <StatsCard
            label="Livraisons"
                value={stats?.totalDeliveries ?? "—"}
            icon="📦"
            tone="green"
          />
          <StatsCard
            label="Revenus cumulés"
                value={stats?.totalRevenue ?? undefined}
            icon="💰"
            tone="purple"
            variant="currency"
          />
              <StatsCard
                label="Régions actives"
                value={stats?.activeRegions ?? "—"}
                icon="🌍"
                tone="orange"
              />
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hqActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ce mois
                </p>
                <h3 className="text-lg font-semibold text-gray-900">Performance mensuelle</h3>
              </div>
              <span className="text-xs font-medium text-gray-400">Temps réel</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">Livraisons</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.thisMonthDeliveries ?? "—"}
                </p>
                    <p className="text-xs text-gray-500">
                      sur les {PERFORMANCE_LOOKBACK_DAYS} derniers jours
                    </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">Revenus</p>
                <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.thisMonthRevenue)}
                </p>
                <p className="text-xs text-gray-500">vs. période précédente</p>
              </div>
            </div>
          </div>

          {regions.length > 0 ? (
            <RegionList title="Performance par région" regions={regions} />
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
              Aucune activité régionale détectée pour cette enseigne.
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </Layout>
  );
}

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <SkeletonPanel key={`stats-${idx}`} />
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <SkeletonPanel key={`actions-${idx}`} lines={2} />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={4} />
    </div>
  </div>
);

const SkeletonPanel = ({ lines = 3 }: { lines?: number }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-4 w-full rounded bg-gray-100"
          style={{ width: `${80 - idx * 10}%` }}
        />
      ))}
    </div>
  </div>
);