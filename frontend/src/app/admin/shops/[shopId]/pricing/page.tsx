"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { PageLoader, PageError, PageNotFound } from "@/components/loading/PageState";
import PricingConfig, { PricingConfig as PricingConfigType } from "@/components/PricingConfig";
import { getShop, updateShop } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

type ShopWithPricing = {
  id: string;
  name: string;
  regionId?: string | null;
  chainId?: string | null;
  pricing?: PricingConfigType | null;
};

const allowedRoles = ["hq", "regional"];

export default function ShopPricingPage() {
  const params = useParams();
  const shopId = typeof params.shopId === "string" ? params.shopId : "";
  const { user, claims, status } = useProtectedRoute({
    redirectTo: "/login/admin",
    requiredRoles: allowedRoles,
  });
  const roles = useMemo(() => {
    const raw = claims?.roles;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }, [claims]);
  const isRegional = roles.includes("regional");
  const userRegionId = typeof claims?.regionId === "string" ? claims.regionId : null;

  const [shop, setShop] = useState<ShopWithPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [useRegionalPricing, setUseRegionalPricing] = useState(false);
  const [regionMismatch, setRegionMismatch] = useState(false);
  const requestIdRef = useRef(0);

  const loadShop = useCallback(async () => {
    if (!shopId) {
      setError("Identifiant de shop invalide");
      setLoading(false);
      return;
    }
    if (!user) return;
    const currentRequest = ++requestIdRef.current;
    setError("");
    setRefreshing((prev) => (prev ? prev : loading));
    if (!refreshing) {
      setLoading(true);
    }
    try {
      const shopData = (await getShop(shopId)) as ShopWithPricing;
      if (currentRequest !== requestIdRef.current) return;
      setShop(shopData);
      setRegionMismatch(
        Boolean(
          isRegional &&
            userRegionId &&
            shopData?.regionId &&
            shopData.regionId !== userRegionId,
        ),
      );
      setUseRegionalPricing(!shopData?.pricing);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message || "Erreur de chargement des tarifs.");
    } finally {
      if (currentRequest === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isRegional, loading, refreshinging, shopId, user, userRegionId]);

  useEffect(() => {
    if (status === "authenticated" && user) {
      loadShop();
    }
  }, [loadShop, status, user]);

  const handleApplyRegionalPricing = useCallback(async () => {
    if (!shopId) return;
    try {
      setSaving(true);
      await updateShop(shopId, { pricing: null });
      setShop((prev) => (prev ? { ...prev, pricing: null } : prev));
      setUseRegionalPricing(true);
      showToast("Tarification régionale appliquée", "success");
    } catch (e) {
      const err = e as { message?: string };
      showToast(err?.message || "Impossible d'appliquer le tarif régional.", "error");
    } finally {
      setSaving(false);
    }
  }, [shopId]);

  const handleSavePricing = async (pricing: PricingConfigType) => {
    if (!shopId) {
      showToast("Impossible de sauvegarder : shopId invalide.", "error");
      return;
    }
    if (useRegionalPricing) {
      await handleApplyRegionalPricing();
      return;
    }
    try {
      setSaving(true);
      await updateShop(shopId, { pricing });
      setShop((prev) => (prev ? { ...prev, pricing } : prev));
      setUseRegionalPricing(false);
      showToast("Configuration de tarification sauvegardée", "success");
    } catch (e) {
      const err = e as { message?: string };
      showToast(err?.message || "Erreur lors de la sauvegarde des tarifs.", "error");
    } finally {
      setSaving(false);
    }
  };

  const lastUpdatedLabel = useMemo(() => {
    if (!refreshing) {
      return `Dernière synchronisation : ${new Date().toLocaleTimeString("fr-CH")}`;
    }
    return "Actualisation en cours…";
  }, [refreshing]);

  if (status === "loading" || !user) {
    return (
      <Layout>
        <PageLoader title="Chargement de la configuration tarifaire..." />
      </Layout>
    );
  }

  const userHasRole = roles.some((role) => allowedRoles.includes(role));
  if (!userHasRole) {
    return (
      <Layout>
        <PageError title="Accès refusé" description="Vous n'avez pas les droits nécessaires pour modifier ces tarifs." />
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <PageLoader title="Chargement des tarifs..." />
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
              onClick={loadShop}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Réessayer
            </button>
          }
        />
      </Layout>
    );
  }

  if (!shop) {
    return (
      <Layout>
        <PageNotFound title="Shop introuvable" description="Ce magasin n'existe pas ou n'est pas accessible." />
      </Layout>
    );
  }

  if (regionMismatch) {
    return (
      <Layout>
        <PageError
          title="Magasin hors périmètre"
          description="Vous ne pouvez pas modifier les tarifs d'un magasin qui n'appartient pas à votre région."
          action={
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Retour
            </button>
          }
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-4xl">
        <Breadcrumbs />
        <header className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Configuration des tarifs</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">{shop.name}</h1>
              <p className="text-sm text-gray-500">
                ID: {shop.id} {shop.regionId ? `• Région ${shop.regionId}` : ""}
              </p>
              <p className="mt-1 text-xs text-gray-400">{lastUpdatedLabel}</p>
            </div>
            <button
              type="button"
              onClick={loadShop}
              disabled={refreshing}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Actualisation..." : "Rafraîchir"}
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Mode de tarification</p>
              <p className="text-sm text-gray-500">
                Les tarifs régionaux s'appliquent automatiquement si aucune configuration magasin n'est définie.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <input
                id="regionalToggle"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={useRegionalPricing}
                onChange={(event) => setUseRegionalPricing(event.target.checked)}
              />
              <label htmlFor="regionalToggle" className="cursor-pointer">
                Utiliser la tarification régionale
              </label>
            </div>
          </div>
          {useRegionalPricing && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Tarifs régionaux actifs</p>
              <p>
                Les tarifs personnalisés du magasin seront supprimés. Les prochains calculs appliqueront la configuration de
                la région.
              </p>
              <button
                type="button"
                onClick={handleApplyRegionalPricing}
                disabled={saving}
                className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Application..." : "Appliquer la tarification régionale"}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <PricingConfig
            key={shop.id}
            initialConfig={shop.pricing ?? undefined}
            onSave={handleSavePricing}
            disabled={saving || useRegionalPricing}
          />
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-medium mb-2">Rappel métier</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Les frais sont calculés automatiquement lors de chaque livraison.</li>
            <li>• Le mode sacs facture par blocs (ex: 15 CHF par 2 sacs).</li>
            <li>• Le mode montant s'adapte au panier (ex: 15 CHF si ≤ 80 CHF, sinon 25 CHF).</li>
            <li>• Les clients CMS bénéficient de tarifs dédiés si configurés.</li>
            <li>• La répartition définit qui encaisse : magasin, autorités, enseigne.</li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}

