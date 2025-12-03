"use client";
import { useEffect, useRef, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthGet, apiAuthPost } from "@/lib/api";
import { showToast } from "@/lib/toast";

type AdminUser = {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  roles: string[];
  shopId?: string | null;
  regionId?: string | null;
};

type EditableAdminUser = AdminUser & {
  rolesDraft: string[];
  shopIdDraft: string;
  regionIdDraft: string;
};

type UsersResp = { items: AdminUser[]; nextPageToken?: string | null };

export default function AdminUsersPage(){
  const [items, setItems] = useState<EditableAdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  const mapEditable = (user: AdminUser): EditableAdminUser => ({
    ...user,
    rolesDraft: [...(user.roles || [])],
    shopIdDraft: user.shopId ?? "",
    regionIdDraft: user.regionId ?? "",
  });

  async function load({ pageToken, replace }: { pageToken?: string; replace?: boolean } = {}){
    setBusy(true);
    try {
      const requestId = ++requestIdRef.current;
      const params = new URLSearchParams();
      if (pageToken) params.set('pageToken', pageToken);
      if (query) params.set('query', query);
      const res = await apiAuthGet<UsersResp>(`/admin/users?${params.toString()}`);
      if (requestId !== requestIdRef.current) return;
      const mapped = res.items.map(mapEditable);
      setItems(prev => (replace ? mapped : [...prev, ...mapped]));
      setNextPageToken(res.nextPageToken || null);
    } catch(e:any){ showToast(e.message || 'Erreur chargement', 'error'); }
    finally { setBusy(false); }
  }

  useEffect(()=>{ load({ replace: true }); },[]);

  useEffect(() => {
    setNextPageToken(null);
  }, [query]);

  const updateUser = (uid: string, patch: Partial<EditableAdminUser>) => {
    setItems(prev =>
      prev.map(user => (user.uid === uid ? { ...user, ...patch } : user)),
    );
  };

  const toggleRole = (user: EditableAdminUser, role: string, checked: boolean) => {
    const current = user.rolesDraft || [];
    const nextRoles = checked
      ? Array.from(new Set([...current, role]))
      : current.filter(r => r !== role);
    updateUser(user.uid, { rolesDraft: nextRoles });
  };

  async function apply(user: EditableAdminUser){
    if (!confirm(`Modifier les droits de ${user.email ?? user.uid} ?`)) return;
    try{
      await apiAuthPost(`/admin/set-claims`, {
        uid: user.uid,
        roles: user.rolesDraft || [],
        shopId: user.shopIdDraft || null,
        regionId: user.regionIdDraft || null,
      });
      showToast('Claims mis à jour','success');
      await load({ replace: true });
    }catch(e:any){ showToast(e.message || 'Erreur mise à jour','error'); }
  }

  const handleSearch = () => {
    setItems([]);
    load({ replace: true });
  };

  const handleNextPage = () => {
    if (!nextPageToken) return;
    load({ pageToken: nextPageToken });
  };

  return (
    <AuthGate>
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin · Utilisateurs</h1>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Recherche (email)</label>
            <input className="border p-2" placeholder="email@exemple.com" value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
          <button className="px-3 py-2 border rounded" onClick={handleSearch} disabled={busy}>Rechercher</button>
          <button className="px-3 py-2 border rounded" disabled={!nextPageToken || busy} onClick={handleNextPage}>Page suivante</button>
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
              const hasAdmin = u.rolesDraft?.includes('admin');
              const hasShop = u.rolesDraft?.includes('shop');
              const hasClient = u.rolesDraft?.includes('client');
              return (
                <tr key={u.uid} className="border-b">
                  <td className="p-2 border text-xs font-mono">{u.uid}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.displayName || ''}</td>
                  <td className="p-2 border">
                    <label className="mr-2">
                      <input
                        type="checkbox"
                        checked={hasAdmin}
                        onChange={(e)=> toggleRole(u, 'admin', e.target.checked)}
                      /> admin
                    </label>
                    <label className="mr-2">
                      <input
                        type="checkbox"
                        checked={hasShop}
                        onChange={(e)=> toggleRole(u, 'shop', e.target.checked)}
                      /> shop
                    </label>
                    <label className="mr-2">
                      <input
                        type="checkbox"
                        checked={hasClient}
                        onChange={(e)=> toggleRole(u, 'client', e.target.checked)}
                      /> client
                    </label>
                  </td>
                  <td className="p-2 border">
                    <input
                      className="border p-1 w-48"
                      value={u.shopIdDraft}
                      onChange={(e)=> updateUser(u.uid, { shopIdDraft: e.target.value })}
                      placeholder="ShopId"
                    />
                  </td>
                  <td className="p-2 border">
                    <select
                      className="border p-1"
                      value={u.regionIdDraft}
                      onChange={(e)=> updateUser(u.uid, { regionIdDraft: e.target.value })}
                    >
                      <option value="">(aucune)</option>
                      {['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'].map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border">
                    <button
                      className="px-2 py-1 border rounded text-xs"
                      disabled={busy}
                      onClick={()=>apply(u)}
                    >
                      Appliquer
                    </button>
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


