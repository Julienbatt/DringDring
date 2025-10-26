"use client";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthGet, apiAuthPost } from "@/lib/api";
import { showToast } from "@/lib/toast";

type AdminUser = { uid: string; email?: string; displayName?: string; disabled: boolean; roles: string[]; shopId?: string | null; regionId?: string | null };
type UsersResp = { items: AdminUser[]; nextPageToken?: string | null };

export default function AdminUsersPage(){
  const [items, setItems] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(pageToken?: string){
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (pageToken) params.set('pageToken', pageToken);
      if (query) params.set('query', query);
      const res = await apiAuthGet<UsersResp>(`/admin/users?${params.toString()}`);
      setItems(res.items);
      setNextPageToken(res.nextPageToken || null);
    } catch(e:any){ showToast(e.message || 'Erreur chargement', 'error'); }
    finally { setBusy(false); }
  }

  useEffect(()=>{ load(); },[]);

  async function apply(u: AdminUser, roles: string[], shopId?: string, regionId?: string){
    try{
      await apiAuthPost(`/admin/set-claims`, { uid: u.uid, roles, shopId: shopId || null, regionId: regionId || null });
      showToast('Claims mis à jour','success');
      await load();
    }catch(e:any){ showToast(e.message || 'Erreur mise à jour','error'); }
  }

  return (
    <AuthGate>
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin · Utilisateurs</h1>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Recherche (email)</label>
            <input className="border p-2" placeholder="email@exemple.com" value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
          <button className="px-3 py-2 border rounded" onClick={()=>load()}>Rechercher</button>
          <button className="px-3 py-2 border rounded" disabled={!nextPageToken || busy} onClick={()=>load(nextPageToken || undefined)}>Page suivante</button>
        </div>

        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border">UID</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Nom</th>
              <th className="p-2 border">Rôles</th>
              <th className="p-2 border">Shop</th>
              <th className="p-2 border">Région</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u=>{
              const hasAdmin = u.roles?.includes('admin');
              const hasShop = u.roles?.includes('shop');
              const hasClient = u.roles?.includes('client');
              return (
                <tr key={u.uid} className="border-b">
                  <td className="p-2 border text-xs font-mono">{u.uid}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.displayName || ''}</td>
                  <td className="p-2 border">
                    <label className="mr-2"><input type="checkbox" defaultChecked={hasAdmin} onChange={(e)=>{ u.roles = e.target.checked ? Array.from(new Set([...(u.roles||[]), 'admin'])) : (u.roles||[]).filter(r=>r!=='admin'); }} /> admin</label>
                    <label className="mr-2"><input type="checkbox" defaultChecked={hasShop} onChange={(e)=>{ u.roles = e.target.checked ? Array.from(new Set([...(u.roles||[]), 'shop'])) : (u.roles||[]).filter(r=>r!=='shop'); }} /> shop</label>
                    <label className="mr-2"><input type="checkbox" defaultChecked={hasClient} onChange={(e)=>{ u.roles = e.target.checked ? Array.from(new Set([...(u.roles||[]), 'client'])) : (u.roles||[]).filter(r=>r!=='client'); }} /> client</label>
                  </td>
                  <td className="p-2 border"><input className="border p-1 w-48" defaultValue={u.shopId || ''} onChange={(e)=>{ (u as any)._shopEdit = e.target.value; }} placeholder="ShopId" /></td>
                  <td className="p-2 border">
                    <select className="border p-1" defaultValue={(u as any).regionId || ''} onChange={(e)=>{ (u as any)._regionEdit = e.target.value; }}>
                      <option value="">(aucune)</option>
                      {['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'].map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border">
                    <button className="px-2 py-1 border rounded text-xs" onClick={()=>apply(u, u.roles || [], (u as any)._shopEdit ?? u.shopId ?? undefined, (u as any)._regionEdit ?? u.regionId ?? undefined)}>Appliquer</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </main>
    </AuthGate>
  );
}


