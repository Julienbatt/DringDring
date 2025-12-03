"use client";
import { useMemo } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { PageLoader, PageError } from "@/components/loading/PageState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { regionalActions } from "@/data/mocks/regionalDashboard";
import { formatCurrency, formatDateLabel } from "@/lib/formatters";
import { useRegionalDashboard } from "@/hooks/useRegionalDashboard";

export default function RegionalAdminPage() {
  const { user, claims, status } = useProtectedRoute({
    redirectTo: "/login/regional",
    requiredRoles: "regional",
  });
  const regionId = typeof claims?.regionId === "string" ? claims.regionId : null;
  const regionLabel = regionId ? `Région ${regionId}` : "Région non définie";
  const {
    stats,
    shops,
    loading,
    error,
    refreshing,
    lastUpdated,
    refresh,
  } = useRegionalDashboard({ enabled: Boolean(user) && Boolean(regionId), regionId: regionId ?? undefined });

  const activeShops = useMemo(() => shops.filter((shop) => shop.status === "active"), [shops]);
  const lastUpdateLabel = useMemo(() => {
    if (refreshing) return "Actualisation en cours…";
    if (!lastUpdated) return "Jamais synchronisé";
    return `Dernière mise à jour : ${lastUpdated.toLocaleTimeString("fr-CH")}`;
  }, [refreshing, lastUpdated]);

  if (status === "loading" || status === "redirecting" || loading) {
    return (
      <Layout>
        <PageLoader title="Chargement du tableau de bord régional..." />
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  if (!regionId) {
    return (
      <Layout>
        <PageError
          title="Région manquante"
          description="Votre compte n'est associé à aucune région. Contactez le support DringDring."
          action={
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
            >
              Réessayer
            </button>
          }
        />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PageError
          title="Erreur"
          description={error}
          action={
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
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
                Administration régionale
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Pilotage de la région</h1>
              <p className="mt-2 text-sm text-gray-600">
                Gestion des magasins, coursiers et performance locale ({regionLabel}).
              </p>
              <p className="mt-1 text-xs text-gray-400">{lastUpdateLabel}</p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Actualisation..." : "Rafraîchir les données"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Magasins" value={stats?.totalShops} icon="🏪" tone="blue" />
          <StatsCard label="Livraisons" value={stats?.totalDeliveries} icon="📦" tone="green" />
          <StatsCard label="Coursiers" value={stats?.activeCouriers} icon="🚴" tone="purple" />
          <StatsCard
            label="Revenus"
            value={stats?.totalRevenue}
            icon="💰"
            tone="orange"
            variant="currency"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-green-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Cette semaine
            </p>
            <p className="mt-2 text-3xl font-bold text-green-900">
              {stats?.thisWeekDeliveries ?? 0} livraisons
            </p>
            <p className="text-sm text-green-800">
              {formatCurrency(stats?.thisWeekRevenue ?? 0)} générés
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Performance magasin
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              {stats?.totalDeliveries && stats?.totalShops
                ? Math.round(stats.totalDeliveries / stats.totalShops)
                : 0}{" "}
              livraisons / magasin
            </p>
            <p className="text-sm text-blue-700">{activeShops.length} magasins actifs</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {regionalActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Magasins
              </p>
              <h3 className="text-lg font-semibold text-gray-900">Performance magasins</h3>
            </div>
            <span className="text-xs text-gray-400">{shops.length} entrées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Magasin", "Enseigne", "Livraisons", "Revenus", "Dernière", "Statut"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{shop.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{shop.chain}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{shop.deliveries}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(shop.revenue)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {shop.lastDelivery !== "Aucune" ? formatDateLabel(shop.lastDelivery) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          shop.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {shop.status === "active" ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}

