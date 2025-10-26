"use client";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthGet, exportShopToSheets, listShops, type Shop, getMe, downloadShopCsv } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";

type Dashboard = {
  today: { deliveries: number; totalBags: number; totalAmount: number };
  week: { deliveries: number; totalBags: number; totalAmount: number };
  month: { deliveries: number; totalBags: number; totalAmount: number };
  topEmployees: { name: string; deliveries: number }[];
  topSectors: { name: string; deliveries: number }[];
  lastUpdated?: string;
};

type Me = {
  userId: string;
  email?: string;
  roles: string[];
  shopId?: string | null;
};

export default function ShopDashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const isAdmin = useMemo(() => !!me?.roles?.includes("admin"), [me]);

  useEffect(() => {
    // Load identity via Firebase auth (fresh token) to avoid 401 race
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setMe(null); return; }
      try {
        const t = await getIdToken(user, true);
        const m = await getMe(t);
        setMe(m);
        const saved = localStorage.getItem("dashboardSelectedShopId") || "";
        const savedAdmin = localStorage.getItem("adminSelectedShopId") || "";
        const initial = saved || savedAdmin || (m.shopId || "");
        setShopId(initial);
        if (m.roles?.includes("admin")) {
          try { setShops(await listShops()); }
          catch (e:any) { setMsg(e?.message || "Chargement des shops impossible"); }
        }
      } catch (e:any) {
        setMsg(e?.message || "Auth expirée - reconnecte-toi");
        setMe(null);
      }
    });
    return () => unsub();
  }, []);

  async function loadDash() {
    if (!shopId) { setMsg("Sélectionne un shop"); return; }
    setLoading(true); setMsg("");
    try {
      const d = await apiAuthGet<Dashboard>(`/shops/${shopId}/dashboard?force=true`);
      setDash(d);
      showToast('Stats chargées', 'success');
    } catch (e:any) {
      const m = e?.message || "Erreur";
      setMsg(m);
      showToast(m, 'error');
    } finally { setLoading(false); }
  }

  function fmt(n?: number) {
    return (n ?? 0).toLocaleString("fr-CH", { maximumFractionDigits: 0 });
  }
  function fmtAmt(n?: number) {
    return (n ?? 0).toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDate(iso?: string) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  return (
    <AuthGate>
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Dashboard du shop</h1>

        <div className="flex items-center gap-3">
          <select
            className="px-2 py-2 border rounded"
            value={shopId}
            onChange={(e)=>{ setShopId(e.target.value); localStorage.setItem("dashboardSelectedShopId", e.target.value); }}
            disabled={!isAdmin}
            title={isAdmin ? "Sélection du shop" : "Shop courant"}
          >
            <option value={me?.shopId || ""}>{me?.shopId ? `Shop courant (${me?.shopId})` : "(aucun shop lié)"}</option>
            {isAdmin && shops.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.id}</option>
            ))}
          </select>

          <button
            className="px-3 py-2 border rounded"
            onClick={loadDash}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Charger les stats"}
          </button>

          <button
            className="px-3 py-2 border rounded bg-yellow-50 disabled:opacity-50"
            disabled={syncBusy}
            onClick={async ()=>{
              if (!shopId) { setMsg("Sélectionne un shop"); return; }
              try {
                setSyncBusy(true);
                const out = await exportShopToSheets(shopId);
                showToast(`Feuille resynchronisée: ${out.rows} lignes`, 'success');
              } catch(e:any){ showToast(e?.message || "Erreur export", 'error'); }
              finally { setSyncBusy(false); }
            }}
          >
            {syncBusy ? 'Resynchronisation...' : 'Resynchroniser la feuille'}
          </button>

          <button
            className="px-3 py-2 border rounded disabled:opacity-50"
            disabled={csvBusy}
            onClick={async ()=>{
              if (!shopId) { setMsg("Sélectionne un shop"); return; }
              try { setCsvBusy(true); await downloadShopCsv(shopId); showToast('CSV téléchargé', 'success'); } catch(e:any){ showToast(e?.message || 'Erreur CSV','error'); } finally { setCsvBusy(false); }
            }}
          >
            {csvBusy ? 'Export...' : 'Export CSV'}
          </button>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {dash && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Aujourd'hui</h3>
                <div>Livraisons: <b>{fmt(dash.today.deliveries)}</b></div>
                <div>Sacs: <b>{fmt(dash.today.totalBags)}</b></div>
                <div>Montant: <b>{fmtAmt(dash.today.totalAmount)}</b></div>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Semaine</h3>
                <div>Livraisons: <b>{fmt(dash.week.deliveries)}</b></div>
                <div>Sacs: <b>{fmt(dash.week.totalBags)}</b></div>
                <div>Montant: <b>{fmtAmt(dash.week.totalAmount)}</b></div>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Mois</h3>
                <div>Livraisons: <b>{fmt(dash.month.deliveries)}</b></div>
                <div>Sacs: <b>{fmt(dash.month.totalBags)}</b></div>
                <div>Montant: <b>{fmtAmt(dash.month.totalAmount)}</b></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Top employé(e)s</h3>
                <ul className="text-sm list-disc pl-5">
                  {dash.topEmployees?.map((t)=> (
                    <li key={t.name}>{t.name}: {fmt(t.deliveries)}</li>
                  ))}
                  {!dash.topEmployees?.length && <li>Aucun</li>}
                </ul>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Top secteurs</h3>
                <ul className="text-sm list-disc pl-5">
                  {dash.topSectors?.map((t)=> (
                    <li key={t.name}>{t.name}: {fmt(t.deliveries)}</li>
                  ))}
                  {!dash.topSectors?.length && <li>Aucun</li>}
                </ul>
              </div>
            </div>

            <div className="text-xs text-gray-500">Dernière mise à jour: {fmtDate(dash.lastUpdated)}</div>
          </section>
        )}
      </main>
    </AuthGate>
  );
}


