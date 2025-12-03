"use client";

import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { ReactNode } from "react";

export type Region = {
  id?: string;
  name: string;
  shops: number;
  deliveries: number;
  revenue: number;
};

type RegionListProps = {
  title?: string;
  regions: Region[];
  onSelect?: (region: Region) => void;
  emptyState?: ReactNode;
};

export function RegionList({ title, regions, onSelect, emptyState }: RegionListProps) {
  if (!regions.length) {
    return (
      (emptyState ?? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Aucune région configurée pour le moment.
      </div>
      ))
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Couverture</p>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        </div>
        <span className="text-xs font-medium text-gray-400">{regions.length} régions</span>
      </div>
      <div className="space-y-4">
        {regions.map((region) => {
          const content = (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">{region.name}</p>
                <p className="text-xs text-gray-500">
                  {formatNumber(region.shops)} magasins • {formatNumber(region.deliveries)} livraisons
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(region.revenue)}</p>
            </div>
          );

          if (onSelect) {
            return (
              <button
                key={region.id ?? region.name}
                type="button"
                onClick={() => onSelect(region)}
                className="w-full rounded-xl border border-gray-100 p-4 text-left transition hover:border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                {content}
              </button>
            );
          }

          return (
            <div key={region.id ?? region.name} className="rounded-xl border border-gray-100 p-4">
              {content}
          </div>
          );
        })}
      </div>
    </div>
  );
}



