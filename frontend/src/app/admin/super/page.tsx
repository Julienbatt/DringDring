"use client";

import { useMemo } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { PageLoader, PageError } from "@/components/loading/PageState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { superActions } from "@/data/mocks/superDashboard";
import { formatCurrency } from "@/lib/formatters";
import { useSuperDashboard } from "@/hooks/useSuperDashboard";

export default function SuperAdminPage() {
  const { user, status } = useProtectedRoute({
    redirectTo: "/login/super",
    requiredRoles: "super",
  });
  const { data, loading, error, lastUpdated, refresh } = useSuperDashboard({ enabled: Boolean(user) });
  const stats = data?.stats ?? null;
  const alerts = data?.alerts ?? [];
  const chains = data?.chains ?? [];
  const regions = data?.regions ?? [];

  const avgDeliveriesPerShop = useMemo(() => {
    if (!stats?.totalDeliveries || !stats?.totalShops) return 0;
    return Math.round(stats.totalDeliveries / stats.totalShops);
  }, [stats]);

  if (status === "loading" || status === "redirecting" || (loading && !data)) {
    return (
      <Layout>
        <PageLoader title="Chargement des données système..." />
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <Layout>
        <PageError
          title="Erreur de chargement"
          description={error}
          action={
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Super administration
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Pilotage global DringDring</h1>
              <p className="mt-2 text-sm text-gray-600">Surveillance du réseau et gouvernance.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {lastUpdated && (
                <span>Dernière synchro : {lastUpdated.toLocaleTimeString("fr-CH")}</span>
              )}
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Actualiser
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard label="Utilisateurs" value={stats?.totalUsers} icon="👥" tone="blue" />
          <StatsCard label="Magasins" value={stats?.totalShops} icon="🏪" tone="green" />
          <StatsCard label="Livraisons" value={stats?.totalDeliveries} icon="📦" tone="purple" />
          <StatsCard
            label="Revenus"
            value={stats?.totalRevenue}
            icon="💰"
            tone="orange"
            variant="currency"
          />
          <StatsCard label="Enseignes" value={stats?.totalChains} icon="🏷️" tone="pink" />
          <StatsCard label="Régions actives" value={stats?.activeRegions} icon="🌍" tone="teal" />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-green-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Santé système</p>
            <p className="mt-2 text-3xl font-bold text-green-900 capitalize">
              {stats?.systemHealth ?? "excellent"}
            </p>
            <p className="text-xs text-green-800">Mesuré sur les 24 dernières heures</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Livraisons / magasin
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{avgDeliveriesPerShop}</p>
            <p className="text-xs text-blue-700">Performance moyenne réseau</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Revenus cumulés
            </p>
            <p className="mt-2 text-3xl font-bold text-purple-900">
              {formatCurrency(stats?.totalRevenue ?? 0)}
            </p>
            <p className="text-xs text-purple-700">Depuis le début de l&apos;année</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {superActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Modules critiques</h3>
            <p className="mb-4 text-sm text-gray-500">Accès rapide pour l’équipe centrale.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Utilisateurs", description: "Rôles, claims, accès", href: "/admin/users" },
                { title: "Régions", description: "Vélocités et cantons", href: "/admin/regional" },
                { title: "Enseignes", description: "HQ & tarification", href: "/admin/hq" },
                { title: "Paramètres globaux", description: "Tarifs par défaut", href: "/admin/settings" },
              ].map((module) => (
                <ActionCard key={module.title} {...module} tone="purple" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alertes système</p>
                <h3 className="text-lg font-semibold text-gray-900">Surveillance temps réel</h3>
              </div>
              <span className="text-xs font-medium text-gray-400">{alerts.length} alerte(s)</span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border-l-4 p-4 ${
                    alert.type === "error"
                      ? "border-red-400 bg-red-50"
                      : alert.type === "warning"
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-blue-400 bg-blue-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500">{alert.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Enseignes</p>
                <h3 className="text-lg font-semibold text-gray-900">Performance par enseigne</h3>
              </div>
              <span className="text-xs text-gray-400">{chains.length} suivies</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Enseigne", "Magasins", "Livraisons", "Revenus"].map((header) => (
                      <th key={header} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chains.slice(0, 6).map((chain) => (
                    <tr key={chain.chainId}>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                        {chain.chainName || chain.chainId}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{chain.shops}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{chain.deliveries}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(chain.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Régions</p>
                <h3 className="text-lg font-semibold text-gray-900">Performance par région</h3>
              </div>
              <span className="text-xs text-gray-400">{regions.length} régions</span>
            </div>
            <div className="space-y-3">
              {regions.slice(0, 6).map((region) => (
                <div key={region.region} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{region.region}</p>
                      <p className="text-xs text-gray-500">
                        {region.deliveries} livraisons • {formatCurrency(region.revenue)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">{region.shops} magasins</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
 