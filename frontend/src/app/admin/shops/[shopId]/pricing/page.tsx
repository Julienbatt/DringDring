"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import PricingConfig, { PricingConfig as PricingConfigType } from "@/components/PricingConfig";
import { getShop, updateShop } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function ShopPricingPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadShop();
  }, [shopId]);

  const loadShop = async () => {
    try {
      setLoading(true);
      const shopData = await getShop(shopId);
      setShop(shopData);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePricing = async (pricing: PricingConfigType) => {
    try {
      await updateShop(shopId, { pricing });
      setShop(prev => ({ ...prev, pricing }));
      showToast("Configuration de tarification sauvegardée", "success");
    } catch (e: any) {
      throw new Error(e?.message || "Erreur de sauvegarde");
    }
  };

  if (loading) {
    return (
      <AuthGate>
        <main className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </AuthGate>
    );
  }

  if (error) {
    return (
      <AuthGate>
        <main className="p-6">
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        </main>
      </AuthGate>
    );
  }

  if (!shop) {
    return (
      <AuthGate>
        <main className="p-6">
          <div className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded">
            Shop non trouvé
          </div>
        </main>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <main className="p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configuration des tarifs</h1>
          <p className="text-gray-600 mt-1">
            Shop: <span className="font-medium">{shop.name}</span> ({shop.id})
          </p>
        </div>

        <PricingConfig
          initialConfig={shop.pricing}
          onSave={handleSavePricing}
        />

        <div className="mt-6 p-4 bg-gray-50 border rounded">
          <h3 className="font-medium mb-2">Comment ça fonctionne</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Les frais sont calculés automatiquement à chaque création/modification de livraison</li>
            <li>• Le mode "sacs" facture par blocs (ex: 15 CHF par 2 sacs)</li>
            <li>• Le mode "montant" facture selon le panier (ex: 15 CHF si ≤ 80 CHF, sinon 25 CHF)</li>
            <li>• Les clients CMS bénéficient de tarifs réduits si configurés</li>
            <li>• La répartition détermine qui encaisse quoi (magasin/autorités/chaîne)</li>
          </ul>
        </div>
      </main>
    </AuthGate>
  );
}

