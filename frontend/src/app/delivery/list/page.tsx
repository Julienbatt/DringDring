"use client";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthGet, apiAuthDelete, apiAuthPatch } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type Delivery = {
  id: string;
  clientId: string;
  shopId: string;
  employee?: string;
  sector?: string;
  ticketNo?: string;
  amount?: number;
  today: boolean;
  startWindow?: string;
  bags: number;
};
type Client = { id: string; firstName?: string; lastName?: string; address?: any; floor?: string; entryCode?: string; phone?: string };

export default function DeliveryListPage() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [msg, setMsg] = useState("");
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ date: string; time: string; employee?: string; sector?: string; bags?: number }>({ date: "", time: "" });
  const [sortAsc, setSortAsc] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevStack, setPrevStack] = useState<string[]>([""]);
  const pageSize = 10;
  // Filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sector, setSector] = useState<string>("");
  const [employee, setEmployee] = useState<string>("");

  function formatDateTime(iso?: string): string {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return iso; }
  }

  const load = async (direction?: 'next'|'prev') => {
    try {
      const params = new URLSearchParams();
      params.set('futureOnly','true');
      params.set('limit', String(pageSize));
      params.set('sort','desc');
      if(direction === 'next' && nextCursor){ params.set('cursor', nextCursor); }
      if(direction === 'prev'){
        const prev = prevStack[prevStack.length-2];
        if(prev){ params.set('cursor', prev); }
      }
      if(dateFrom){ params.set('dateFrom', `${dateFrom}T00:00:00Z`); }
      if(dateTo){ params.set('dateTo', `${dateTo}T23:59:59Z`); }
      if(sector.trim()){ params.set('sector', sector.trim()); }
      if(employee.trim()){ params.set('employee', employee.trim()); }
      const res = await apiAuthGet<{items: Delivery[]; nextCursor?: string}>(`/deliveries?${params.toString()}`);
      setItems(res.items);
      if(!direction){ setPrevStack([""]); }
      if(direction === 'next' && (nextCursor || res.nextCursor)) setPrevStack(s=>[...s, (nextCursor || res.nextCursor || "")]);
      if(direction === 'prev') setPrevStack(s=> s.slice(0, Math.max(1, s.length-1)) );
      setNextCursor(res.nextCursor || null);
      // fetch client display names for clarity
      const ids = Array.from(new Set(res.items.map(r=>r.clientId)));
      const dict: Record<string, Client> = {};
      await Promise.all(ids.map(async (id) => {
        try { dict[id] = await apiAuthGet<Client>(`/clients/${id}`); } catch {}
      }));
      setClients(dict);
    } catch (e:any) {
      setMsg(e.message);
    }
  };

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      if (u) load();
    });
    return () => unsub();
  },[]);

  const sorted = useMemo(()=>{
    const arr = [...items];
    arr.sort((a,b)=>{
      const da = a.startWindow ? Date.parse(a.startWindow) : 0;
      const db = b.startWindow ? Date.parse(b.startWindow) : 0;
      return sortAsc ? da - db : db - da;
    });
    return arr;
  },[items, sortAsc]);

  const visible = sorted;

  function startEdit(d: Delivery) {
    let date = ""; let time = "";
    if (d.startWindow) {
      const dt = new Date(d.startWindow);
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
      const dd = String(dt.getUTCDate()).padStart(2,'0');
      date = `${yyyy}-${mm}-${dd}`;
      time = `${String(dt.getUTCHours()).padStart(2,'0')}:${String(dt.getUTCMinutes()).padStart(2,'0')}`;
    }
    setEditingId(d.id);
    setEditForm({ date, time, employee: d.employee, sector: d.sector, bags: d.bags });
  }

  async function saveEdit(id: string) {
    try {
      const startWindow = editForm.date && editForm.time ? new Date(`${editForm.date}T${editForm.time}:00Z`).toISOString() : undefined;
      const payload: any = { employee: editForm.employee, sector: editForm.sector, bags: editForm.bags };
      if (startWindow) payload.startWindow = startWindow;
      await apiAuthPatch(`/deliveries/${id}`, payload);
      setEditingId(null);
      await load();
      showToast('Livraison mise à jour', 'success');
    } catch (e:any) { showToast(e.message || 'Erreur', 'error'); }
  }

  return (
    <AuthGate>
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">Livraisons en cours</h1>
        {msg && <p className="text-red-600">{msg}</p>}
        <div className="flex flex-wrap items-end gap-2 border p-3 rounded">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Du</label>
            <input type="date" className="border p-1" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Au</label>
            <input type="date" className="border p-1" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Secteur</label>
            <input className="border p-1" value={sector} onChange={e=>setSector(e.target.value)} placeholder="ex: Sion" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Employé(e)</label>
            <input className="border p-1" value={employee} onChange={e=>setEmployee(e.target.value)} placeholder="ex: Jean" />
          </div>
          <button className="px-3 py-2 border rounded" onClick={()=>load()}>Filtrer</button>
          <button className="px-3 py-2 border rounded" onClick={()=>{ setDateFrom(""); setDateTo(""); setSector(""); setEmployee(""); load(); }}>Réinitialiser</button>
        </div>
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Client</th>
              <th className="p-2 border cursor-pointer" onClick={()=>setSortAsc(s=>!s)}>Date/Heure {sortAsc ? '▲' : '▼'}</th>
              <th className="p-2 border"># Sacs</th>
              <th className="p-2 border">Employé(e)</th>
              <th className="p-2 border">Secteur</th>
              <th className="p-2 border">Notes</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d, idx) => (
              <tr key={`${d.id}-${idx}`} className="border-b">
                <td className="p-2 border font-mono text-xs">{d.id}</td>
                <td className="p-2 border">
                  <div className="font-medium">{clients[d.clientId]?.firstName} {clients[d.clientId]?.lastName}</div>
                  {clients[d.clientId]?.address && (
                    <div className="text-xs text-gray-600">
                      {clients[d.clientId]?.address?.street} {clients[d.clientId]?.address?.streetNumber}, {clients[d.clientId]?.address?.zip} {clients[d.clientId]?.address?.city}
                    </div>
                  )}
                  {clients[d.clientId]?.floor && (<div className="text-xs text-gray-600">Étage: {clients[d.clientId]?.floor}</div>)}
                  {clients[d.clientId]?.entryCode && (<div className="text-xs text-gray-600">Code: {clients[d.clientId]?.entryCode}</div>)}
                  {clients[d.clientId]?.phone && (<div className="text-xs text-gray-600">Tél: {clients[d.clientId]?.phone}</div>)}
                </td>
                <td className="p-2 border">
                  {editingId===d.id ? (
                    <div className="flex gap-2">
                      <input type="date" className="border p-1" value={editForm.date} onChange={e=>setEditForm({...editForm, date:e.target.value})} />
                      <input type="time" className="border p-1" step={1800} value={editForm.time} onChange={e=>setEditForm({...editForm, time:e.target.value})} />
                    </div>
                  ) : (formatDateTime(d.startWindow))}
                </td>
                <td className="p-2 border">
                  {editingId===d.id ? (
                    <input type="number" min={0} max={20} className="border p-1 w-20" value={editForm.bags ?? d.bags} onChange={e=>setEditForm({...editForm, bags: Number(e.target.value)})} />
                  ) : d.bags}
                </td>
                <td className="p-2 border">
                  {editingId===d.id ? (
                    <input className="border p-1" value={editForm.employee ?? d.employee ?? ''} onChange={e=>setEditForm({...editForm, employee: e.target.value})} />
                  ) : (d.employee || '')}
                </td>
                <td className="p-2 border">
                  {editingId===d.id ? (
                    <input className="border p-1" value={editForm.sector ?? d.sector ?? ''} onChange={e=>setEditForm({...editForm, sector: e.target.value})} />
                  ) : (d.sector || '')}
                </td>
                <td className="p-2 border">
                  {editingId===d.id ? (
                    <input className="border p-1 w-full" value={(editForm as any).courierNotes ?? ''} onChange={e=>setEditForm({...editForm, ...( { courierNotes: e.target.value } as any) })} />
                  ) : ( (d as any).courierNotes || '' )}
                </td>
                <td className="p-2 border space-x-2">
                  {editingId===d.id ? (
                    <>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=>saveEdit(d.id)}>Enregistrer</button>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=>setEditingId(null)}>Annuler</button>
                    </>
                  ) : (
                    <>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=>startEdit(d)}>Éditer</button>
                      <button className="px-2 py-1 border rounded text-xs" onClick={async()=>{ if(confirm('Supprimer ?')){ try { await apiAuthDelete(`/deliveries/${d.id}`); await load(); showToast('Livraison supprimée','success'); } catch(e:any){ showToast(e.message || 'Erreur','error'); } } }}>Supprimer</button>
                      {/* Quick actions */}
                      <button className="px-2 py-1 border rounded text-xs" onClick={async()=>{
                        const c = clients[d.clientId];
                        const a = c?.address; const line = a ? `${a.street||''} ${a.streetNumber||''}, ${a.zip||''} ${a.city||''}`.trim() : '';
                        try { if(line) await navigator.clipboard.writeText(line); } catch {}
                      }}>Copier adresse</button>
                      <a className="px-2 py-1 border rounded text-xs" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clients[d.clientId]?.address?.street||''} ${clients[d.clientId]?.address?.streetNumber||''} ${clients[d.clientId]?.address?.zip||''} ${clients[d.clientId]?.address?.city||''}`)}`} target="_blank" rel="noreferrer">Maps</a>
                      {clients[d.clientId]?.phone && (
                        <a className="px-2 py-1 border rounded text-xs" href={`tel:${(clients[d.clientId]?.phone||'').replace(/\s+/g,'')}`}>Appeler</a>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border rounded" onClick={load}>Refresh</button>
          <button className="px-2 py-1 border rounded text-xs" disabled={prevStack.length<=1} onClick={()=>load('prev')}>Précédent</button>
          <button className="px-2 py-1 border rounded text-xs" disabled={!nextCursor} onClick={()=>load('next')}>Suivant</button>
        </div>
      </main>
    </AuthGate>
  );
}


