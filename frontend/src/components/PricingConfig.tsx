"use client";
import { useState } from "react";

export interface PricingConfig {
  mode: "bags" | "amount";
  bags?: {
    bagsPerStep: number;
    pricePerStep: number;
    cmsPricePerStep?: number;
  };
  amount?: {
    threshold: number;
    priceBelowOrEqual: number;
    priceAbove: number;
    cmsPriceBelowOrEqual?: number;
    cmsPriceAbove?: number;
  };
  split: {
    shopPercent: number;
    authorityPercent: number;
    chainPercent: number;
  };
}

interface PricingConfigProps {
  initialConfig?: PricingConfig;
  onSave: (config: PricingConfig) => Promise<void>;
  disabled?: boolean;
}

export default function PricingConfig({ initialConfig, onSave, disabled = false }: PricingConfigProps) {
  const [config, setConfig] = useState<PricingConfig>(initialConfig || {
    mode: "bags",
    bags: {
      bagsPerStep: 2,
      pricePerStep: 15,
      cmsPricePerStep: 10,
    },
    amount: {
      threshold: 80,
      priceBelowOrEqual: 15,
      priceAbove: 25,
      cmsPriceBelowOrEqual: 10,
      cmsPriceAbove: 20,
    },
    split: {
      shopPercent: 33.34,
      authorityPercent: 33.33,
      chainPercent: 33.33,
    },
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const updateConfig = (updates: Partial<PricingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setError("");
  };

  const updateBags = (updates: Partial<PricingConfig['bags']>) => {
    setConfig(prev => ({
      ...prev,
      bags: { ...prev.bags!, ...updates }
    }));
    setError("");
  };

  const updateAmount = (updates: Partial<PricingConfig['amount']>) => {
    setConfig(prev => ({
      ...prev,
      amount: { ...prev.amount!, ...updates }
    }));
    setError("");
  };

  const updateSplit = (updates: Partial<PricingConfig['split']>) => {
    setConfig(prev => ({
      ...prev,
      split: { ...prev.split, ...updates }
    }));
    setError("");
  };

  const handleSave = async () => {
    try {
      setBusy(true);
      setError("");
      
      // Validation
      if (config.mode === "bags" && (!config.bags?.bagsPerStep || !config.bags?.pricePerStep)) {
        throw new Error("Configuration sacs incomplète");
      }
      if (config.mode === "amount" && (!config.amount?.threshold || !config.amount?.priceBelowOrEqual || !config.amount?.priceAbove)) {
        throw new Error("Configuration montant incomplète");
      }
      
      const totalSplit = (config.split.shopPercent + config.split.authorityPercent + config.split.chainPercent);
      if (Math.abs(totalSplit - 100) > 0.01) {
        throw new Error(`Répartition doit totaliser 100% (actuellement ${totalSplit.toFixed(2)}%)`);
      }

      await onSave(config);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || "Erreur de sauvegarde");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Configuration des tarifs</h3>
        <button
          onClick={handleSave}
          disabled={busy || disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Mode sélection */}
      <div>
        <label className="block text-sm font-medium mb-2">Mode de tarification</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="mode"
              value="bags"
              checked={config.mode === "bags"}
              onChange={(e) => updateConfig({ mode: e.target.value as "bags" })}
              disabled={disabled}
              className="mr-2"
            />
            Par nombre de sacs
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="mode"
              value="amount"
              checked={config.mode === "amount"}
              onChange={(e) => updateConfig({ mode: e.target.value as "amount" })}
              disabled={disabled}
              className="mr-2"
            />
            Par montant du panier
          </label>
        </div>
      </div>

      {/* Configuration par sacs */}
      {config.mode === "bags" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sacs par étape</label>
            <input
              type="number"
              min="1"
              value={config.bags?.bagsPerStep || 2}
              onChange={(e) => updateBags({ bagsPerStep: parseInt(e.target.value) || 2 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prix par étape (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.bags?.pricePerStep || 15}
              onChange={(e) => updateBags({ pricePerStep: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prix CMS par étape (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.bags?.cmsPricePerStep || ""}
              onChange={(e) => updateBags({ cmsPricePerStep: parseFloat(e.target.value) || undefined })}
              disabled={disabled}
              placeholder="Optionnel (utilise prix normal si vide)"
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
      )}

      {/* Configuration par montant */}
      {config.mode === "amount" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seuil (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.amount?.threshold || 80}
              onChange={(e) => updateAmount({ threshold: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prix ≤ seuil (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.amount?.priceBelowOrEqual || 15}
              onChange={(e) => updateAmount({ priceBelowOrEqual: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prix &gt; seuil (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.amount?.priceAbove || 25}
              onChange={(e) => updateAmount({ priceAbove: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prix CMS ≤ seuil (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.amount?.cmsPriceBelowOrEqual || ""}
              onChange={(e) => updateAmount({ cmsPriceBelowOrEqual: parseFloat(e.target.value) || undefined })}
              disabled={disabled}
              placeholder="Optionnel"
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prix CMS &gt; seuil (CHF)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={config.amount?.cmsPriceAbove || ""}
              onChange={(e) => updateAmount({ cmsPriceAbove: parseFloat(e.target.value) || undefined })}
              disabled={disabled}
              placeholder="Optionnel"
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
      )}

      {/* Répartition des frais */}
      <div>
        <label className="block text-sm font-medium mb-2">Répartition des frais (%)</label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Magasin</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.split.shopPercent}
              onChange={(e) => updateSplit({ shopPercent: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Autorités</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.split.authorityPercent}
              onChange={(e) => updateSplit({ authorityPercent: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Chaîne</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.split.chainPercent}
              onChange={(e) => updateSplit({ chainPercent: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Total: {(config.split.shopPercent + config.split.authorityPercent + config.split.chainPercent).toFixed(2)}%
        </p>
      </div>

      {/* Exemple de calcul */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-medium text-blue-900 mb-2">Exemple de calcul</h4>
        {config.mode === "bags" && config.bags && (
          <div className="text-sm text-blue-800">
            <p>• 3 sacs = {Math.ceil(3 / config.bags.bagsPerStep)} étape(s) × {config.bags.pricePerStep} CHF = {Math.ceil(3 / config.bags.bagsPerStep) * config.bags.pricePerStep} CHF</p>
            <p>• 4 sacs = {Math.ceil(4 / config.bags.bagsPerStep)} étape(s) × {config.bags.pricePerStep} CHF = {Math.ceil(4 / config.bags.bagsPerStep) * config.bags.pricePerStep} CHF</p>
            {config.bags.cmsPricePerStep && (
              <p>• CMS: 3 sacs = {Math.ceil(3 / config.bags.bagsPerStep)} étape(s) × {config.bags.cmsPricePerStep} CHF = {Math.ceil(3 / config.bags.bagsPerStep) * config.bags.cmsPricePerStep} CHF</p>
            )}
          </div>
        )}
        {config.mode === "amount" && config.amount && (
          <div className="text-sm text-blue-800">
            <p>• Panier 50 CHF ≤ {config.amount.threshold} CHF → {config.amount.priceBelowOrEqual} CHF</p>
            <p>• Panier 100 CHF &gt; {config.amount.threshold} CHF → {config.amount.priceAbove} CHF</p>
            {config.amount.cmsPriceBelowOrEqual && (
              <p>• CMS: Panier 50 CHF → {config.amount.cmsPriceBelowOrEqual} CHF</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

