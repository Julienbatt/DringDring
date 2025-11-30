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

export async function getMe(token: string) {
  return apiGet("/auth/me", {
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

export type Shop = {
  id: string;
  name: string;
};

export async function listShops(): Promise<Shop[]> {
  return apiAuthGet<Shop[]>(`/shops`);
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

export async function createShop(body: any): Promise<{ id: string }> {
  return apiAuthPost<{ id: string }>(`/shops`, body);
}

export async function getHqDashboard(chainId: string, regionId: string): Promise<any> {
  return apiAuthGet(`/shops/chains/${chainId}/regions/${regionId}/dashboard`);
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
  return apiAuthGet(`/shops`);
}

export async function getShop(shopId: string): Promise<any> {
  return apiAuthGet(`/shops/${shopId}`);
}

export async function updateShop(shopId: string, updates: any): Promise<any> {
  return apiAuthPatch(`/shops/${shopId}`, updates);
}