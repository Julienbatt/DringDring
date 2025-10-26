"use client";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthGet, apiAuthPost } from "@/lib/api";
import { showToast } from "@/lib/toast";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  address?: { street: string; streetNumber: string; zip: string; city: string };
  email?: string;
  phone?: string;
  floor?: string;
  entryCode?: string;
  cms?: boolean;
};

export default function NewDeliveryPage() {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [selectedData, setSelectedData] = useState<Client | null>(null);
  const [form, setForm] = useState({
    shopId: "", // optional for now; if blank, backend will still accept if admin
    employee: "",
    sector: "",
    ticketNo: "",
    amount: "",
    today: true,
    date: "",
    time: "",
    bags: 1,
    courierNotes: "",
  });
  const [msg, setMsg] = useState("");
  const selectedClient = useMemo(() => selectedData ?? clients.find(c => c.id === selected), [selectedData, clients, selected]);

  function generateTimeOptions(): string[] {
    const times: string[] = [];
    for (let m = 8*60 + 30; m <= 20*60; m += 30) {
      const h = String(Math.floor(m/60)).padStart(2, '0');
      const mm = String(m%60).padStart(2, '0');
      times.push(`${h}:${mm}`);
    }
    return times;
  }

  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) { setClients([]); return; }
      try {
        const res = await apiAuthGet<Client[]>(`/clients?query=${encodeURIComponent(q)}`);
        if (active) setClients(res);
      } catch (e:any) { /* ignore */ }
    }, 300);
    return () => { active = false; clearTimeout(handler); };
  }, [query]);

  useEffect(() => {
    const c = clients.find((x)=>x.id===selected);
    if (c) {
      // You can display prefilled info or just keep in memory for review
      // For this quick form, no extra fields to fill, but this hook is ready for extending
    }
  }, [selected, clients]);

  // Default date to today on first render
  useEffect(()=>{
    if (!form.date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      setForm((f)=>({ ...f, date: `${yyyy}-${mm}-${dd}` }));
    }
    if (!form.time) {
      const now = new Date();
      const minutes = now.getHours()*60 + now.getMinutes();
      const minM = 8*60 + 30; // 08:30
      const maxM = 20*60;     // 20:00
      let t = "08:30";
      if (minutes >= minM && minutes <= maxM) {
        const rounded = Math.ceil(minutes/30)*30;
        const hh = String(Math.floor(rounded/60)).padStart(2,'0');
        const mm2 = String(rounded%60).padStart(2,'0');
        t = `${hh}:${mm2}`;
      }
      setForm((f)=>({ ...f, time: t }));
    }
  },[]);

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    try {
      setBusy(true);
      if (!selected) { setMsg("Select client"); return; }
      // Build ISO startWindow from date + time
      // Validate time between 08:30 and 20:00
      if (!form.time) { setMsg("Please select a time"); return; }
      const [hh, mm] = form.time.split(":").map(Number);
      const minutes = hh*60 + mm;
      const minM = 8*60 + 30; // 08:30
      const maxM = 20*60;     // 20:00
      if (minutes < minM || minutes > maxM) { setMsg("Time must be between 08:30 and 20:00"); return; }
      const startWindow = form.date && form.time ? new Date(`${form.date}T${form.time}:00Z`).toISOString() : undefined;
      const payload: any = {
        shopId: form.shopId || undefined,
        clientId: selected,
        employee: form.employee || "",
        sector: form.sector || undefined,
        ticketNo: form.ticketNo || undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        today: form.today,
        startWindow,
        bags: Number(form.bags) || 1,
        courierNotes: form.courierNotes || undefined,
      };
      const res = await apiAuthPost<{id:string}>("/deliveries", payload);
      showToast('Livraison créée','success');
      setMsg(`Delivery created: ${res.id}`);
    } catch (e:any) {
      showToast(e?.message || 'Erreur','error');
      setMsg(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthGate>
      <main className="p-6 space-y-3 max-w-2xl">
        <h1 className="text-2xl font-bold">New delivery</h1>
        <input className="border p-2 w-full" placeholder="Search client..." value={query} onChange={(e)=>{ setQuery(e.target.value); setSelected(""); setSelectedData(null); }} />
        {clients.length>0 && (
          <ul className="border rounded divide-y max-h-48 overflow-auto">
            {clients.map(c=> (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full text-left p-2 ${selected===c.id? 'bg-gray-100':''}`}
                  onClick={()=>{ setSelected(c.id); setSelectedData(c); setClients([]); setQuery(`${c.firstName} ${c.lastName}`); }}
                >
                  {c.firstName} {c.lastName}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input className="border p-2" placeholder="Employé(e)" value={form.employee} onChange={e=>setForm({...form, employee:e.target.value})} />
          <input className="border p-2" placeholder="Secteur (optionnel)" value={form.sector} onChange={e=>setForm({...form, sector:e.target.value})} />
          <input className="border p-2" placeholder="Ticket no (optionnel)" value={form.ticketNo} onChange={e=>setForm({...form, ticketNo:e.target.value})} />
          <input className="border p-2" placeholder="Montant (optionnel)" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} />
          <input className="border p-2" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
          <select className="border p-2" value={form.time} onChange={e=>setForm({...form, time: e.target.value})}>
            {generateTimeOptions().map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input className="border p-2" placeholder="Bags" type="number" min={0} max={20} value={form.bags} onChange={e=>setForm({...form, bags: Number(e.target.value)})} />
          <input className="border p-2 col-span-2" placeholder="Notes coursier (optionnel)" value={form.courierNotes} onChange={e=>setForm({...form, courierNotes: e.target.value})} />
        </div>
        <button className="px-4 py-2 bg-black text-white rounded disabled:opacity-50" disabled={busy} onClick={submit}>{busy? 'Création...' : 'Create delivery'}</button>
        {msg && <p className="text-sm">{msg}</p>}
        {selectedClient && (
          <div className="mt-4 p-3 border rounded bg-gray-50">
            <h2 className="font-semibold mb-2">Client details</h2>
            <div className="text-sm">
              <div>{selectedClient.firstName} {selectedClient.lastName}</div>
              {selectedClient.address && (
                <div>{selectedClient.address.street} {selectedClient.address.streetNumber}, {selectedClient.address.zip} {selectedClient.address.city}</div>
              )}
              {selectedClient.floor && <div>Étage: {selectedClient.floor}</div>}
              {selectedClient.entryCode && <div>Code: {selectedClient.entryCode}</div>}
              {selectedClient.phone && <div>Tél: {selectedClient.phone}</div>}
              {selectedClient.email && <div>Email: {selectedClient.email}</div>}
              {typeof selectedClient.cms === 'boolean' && <div>CMS: {selectedClient.cms ? 'Oui' : 'Non'}</div>}
            </div>
          </div>
        )}
      </main>
    </AuthGate>
  );
}


