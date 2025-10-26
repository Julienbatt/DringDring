"use client";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { getHealth, getMe, apiAuthPost, apiAuthGet, exportShopToSheets, listShops, type Shop } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [health, setHealth] = useState<string>("checking...");
  const [me, setMe] = useState<any>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");

  useEffect(() => {
    getHealth().then((x) => setHealth(x.status)).catch(() => setHealth("error"));
  }, []);

  useEffect(() => {
    // load shops for admin
    (async () => {
      try {
        if (me?.roles?.includes("admin")) {
          const s = await listShops();
          setShops(s);
          const saved = localStorage.getItem("adminSelectedShopId") || "";
          if (saved) setSelectedShop(saved);
        } else {
          setShops([]);
          setSelectedShop("");
        }
      } catch {}
    })();
  }, [me]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMe(null);
        return;
      }
      try {
        const t = await getIdToken(user, true);
        const meResp = await getMe(t);
        setMe(meResp);
      } catch {
        setMe(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthGate>
      <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">DringDring</h1>
        <p className="mt-2">Backend health: <span className="font-mono">{health}</span></p>
        {me && (
          <pre className="mt-4 p-3 bg-gray-100 rounded text-sm overflow-auto">{JSON.stringify(me, null, 2)}</pre>
        )}
        <div className="space-x-2">
          <button
            className="px-3 py-2 border rounded"
            onClick={async () => {
              try {
                const created = await apiAuthPost<{id: string}>("/clients", {
                  firstName: "Jean",
                  lastName: "Dupont",
                  address: { street: "Rue du Test", streetNumber: "1", zip: "1950", city: "Sion" },
                  email: "jean.dupont@example.com",
                  phone: "+41 79 000 00 00",
                  cms: false,
                });
                alert(`Client created: ${created.id}`);
              } catch (e:any) { alert(e.message); }
            }}
          >
            Create sample client
          </button>
          <button
            className="px-3 py-2 border rounded"
            onClick={async () => {
              try {
                const list = await apiAuthGet<any[]>("/clients?query=dup");
                alert(`Found ${list.length} clients matching 'dup'`);
              } catch (e:any) { alert(e.message); }
            }}
          >
            Search clients 'dup'
          </button>
          {me?.roles?.includes("admin") && (
            <span className="inline-flex items-center gap-2">
              <select
                className="px-2 py-2 border rounded"
                value={selectedShop || me?.shopId || ""}
                onChange={(e) => {
                  setSelectedShop(e.target.value);
                  localStorage.setItem("adminSelectedShopId", e.target.value);
                }}
              >
                <option value={me?.shopId || ""}>
                  {me?.shopId ? `Shop courant (${me?.shopId})` : "(aucun shop lié)"}
                </option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.id}</option>
                ))}
              </select>
            </span>
          )}
          {me?.roles?.includes("admin") && (
            <button
              className="px-3 py-2 border rounded bg-yellow-50"
              onClick={async () => {
                try {
                  const sid = selectedShop || me?.shopId;
                  if (!sid) { alert("Sélectionne un shop"); return; }
                  const out = await exportShopToSheets(sid);
                  alert(`Feuille resynchronisée: ${out.rows} lignes`);
                } catch (e:any) { alert(e.message); }
              }}
            >
              Resynchroniser la feuille (shop)
            </button>
          )}
        </div>
        {me?.roles?.includes("shop") && (
          <section className="mt-6 p-4 border rounded">
            <h2 className="font-semibold mb-2">Aperçu (aujourd'hui / semaine / mois)</h2>
            <button
              className="px-3 py-2 border rounded"
              onClick={async ()=>{
                try{
                  const sid = selectedShop || me?.shopId;
                  if(!sid){ alert('Aucun shop sélectionné'); return; }
                  const dash = await apiAuthGet<any>(`/shops/${sid}/dashboard`);
                  alert(JSON.stringify(dash, null, 2));
                }catch(e:any){ alert(e.message) }
              }}
            >
              Charger les stats
            </button>
          </section>
        )}
    </main>
    </AuthGate>
  );
}
