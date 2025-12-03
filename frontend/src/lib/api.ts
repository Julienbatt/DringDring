"use client";

import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      // Do not set Content-Type for GET to avoid triggering CORS preflight unnecessarily
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Session expirée - reconnecte-toi");
    if (res.status === 0) throw new Error("Serveur injoignable - vérifie ta connexion");
    throw new Error(`GET ${path} ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const getHealth = () => apiGet<{status: string}>("/health");

export type Me = {
  userId: string;
  email?: string;
  roles: string[];
  shopId?: string | null;
  clientId?: string | null;
  regionId?: string | null;
  chainId?: string | null;
};

export async function getMe(token: string): Promise<Me> {
  return apiGet<Me>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    console.error("❌ Aucun utilisateur Firebase connecté");
    return {};
  }
  
  try {
    const token = await getIdToken(user, true);
    console.log("🔑 Token Firebase obtenu:", token ? "✅ Valide" : "❌ Invalide");
    console.log("👤 User UID:", user.uid);
    return { Authorization: `Bearer ${token}` };
  } catch (error) {
    console.error("❌ Erreur lors de l'obtention du token:", error);
    return {};
  }
}

export async function apiAuthGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  return apiGet<T>(path, { headers });
}

export async function apiAuthPost<T>(path: string, body: unknown): Promise<T> {
  const headers = {
    ...(await getAuthHeader()),
    "Content-Type": "application/json",
  } as Record<string, string>;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function apiAuthDelete<T = unknown>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function apiAuthPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = {
    ...(await getAuthHeader()),
    "Content-Type": "application/json",
  } as Record<string, string>;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function apiAuthPut<T>(path: string, body: unknown): Promise<T> {
  const headers = {
    ...(await getAuthHeader()),
    "Content-Type": "application/json",
  } as Record<string, string>;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function exportShopToSheets(shopId: string): Promise<{ ok: boolean; rows: number }> {
  return apiAuthPost<{ ok: boolean; rows: number }>(`/shops/${shopId}/sheets/export`, {});
}

// Address type matching backend schema
export type Address = {
  street: string;
  streetNumber: string;
  zip: string; // Swiss NPA (4 digits)
  city: string;
};

// Contact type matching backend schema
export type Contact = {
  name: string;
  email?: string;
  phone?: string;
};

// ShopPricing types matching backend schema
export type PricingSplit = {
  shopPercent: number;
  authorityPercent: number;
  chainPercent: number;
};

export type PricingBagsConfig = {
  bagsPerStep: number;
  pricePerStep: number;
  cmsPricePerStep?: number;
};

export type PricingAmountConfig = {
  threshold: number;
  priceBelowOrEqual: number;
  priceAbove: number;
  cmsPriceBelowOrEqual?: number;
  cmsPriceAbove?: number;
};

export type ShopPricing = {
  mode: "bags" | "amount";
  bags?: PricingBagsConfig;
  amount?: PricingAmountConfig;
  split: PricingSplit;
};

// Full Shop type matching backend Shop schema
export type Shop = {
  id: string;
  name: string;
  address: Address;
  email: string;
  phone: string;
  contacts: Contact[];
  departments: string[];
  spreadsheetId?: string;
  sheetName?: string;
  regionId?: string;
  chainId?: string;
  chainName?: string;
  shopType?: "store" | "hq";
  parentShopId?: string;
  pricing?: ShopPricing;
  updatedAt?: string;
};

// Shop summary type for list endpoints (only id and name)
export type ShopSummary = {
  id: string;
  name: string;
};

export async function listShops(): Promise<ShopSummary[]> {
  return apiAuthGet<ShopSummary[]>(`/shops`);
}

export async function downloadShopCsv(shopId: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/shops/${shopId}/export.csv`, { headers });
  if (!res.ok) throw new Error(`GET /shops/${shopId}/export.csv ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export_${shopId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ShopUpdate type for partial updates
export type ShopUpdate = {
  name?: string;
  address?: Address;
  email?: string;
  phone?: string;
  contacts?: Contact[];
  departments?: string[];
  spreadsheetId?: string;
  sheetName?: string;
  pricing?: ShopPricing;
  [key: string]: unknown;
};

// ShopFull is just an alias for Shop (the full shop object)
export type ShopFull = Shop;

// Period totals structure matching backend dashboard response
export type PeriodTotals = {
  deliveries: number;
  totalBags: number;
  totalAmount: number;
  totalFees: number;
  shopFees: number;
  authorityFees: number;
  chainFees: number;
};

// Top item structure
export type TopItem = {
  name: string;
  deliveries: number;
};

// HqDashboard type matching backend /chains/{chain_id}/regions/{region_id}/dashboard response
export type HqDashboard = {
  today: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
  topEmployees: TopItem[];
  topSectors: TopItem[];
  lastUpdated: string;
};

export async function createShop(body: Record<string, unknown>): Promise<{ id: string }> {
  return apiAuthPost<{ id: string }>(`/shops`, body);
}

export async function getHqDashboard(chainId: string, regionId: string): Promise<HqDashboard> {
  return apiAuthGet<HqDashboard>(`/shops/chains/${chainId}/regions/${regionId}/dashboard`);
}

export async function exportHqToSheets(chainId: string, regionId: string, spreadsheetId: string, sheetName = 'Livraisons'): Promise<{ ok: boolean; rows: number }>{
  return apiAuthPost<{ ok: boolean; rows: number }>(`/shops/chains/${chainId}/regions/${regionId}/sheets/export`, { spreadsheetId, sheetName });
}

export async function listChains(regionId?: string): Promise<string[]> {
  const q = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
  const resp = await apiAuthGet<{ items: string[] }>(`/shops/chains${q}`);
  return resp.items;
}

export async function listShopsSimple(): Promise<{id:string; name?:string}[]> {
  return apiAuthGet<{id:string; name?:string}[]>(`/shops`);
}

export async function getShop(shopId: string): Promise<Shop> {
  return apiAuthGet<Shop>(`/shops/${shopId}`);
}

export async function updateShop(shopId: string, updates: ShopUpdate): Promise<Shop> {
  return apiAuthPatch<Shop>(`/shops/${shopId}`, updates);
}