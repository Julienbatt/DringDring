"use client";
import { useEffect, useMemo, useState } from "react";
import ShopLayout from "@/components/ShopLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { apiAuthGet, apiAuthPost } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
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

  // Vérifier l'authentification et le rôle
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        // Si pas connecté, rediriger immédiatement vers la page de login avec le rôle shop
        console.log("Utilisateur non connecté, redirection vers login...");
        router.replace('/login?role=shop');
      } else {
        // Vérifier que le token est valide
        try {
          const token = await user.getIdToken();
          console.log("Token Firebase obtenu:", token ? "✅ Valide" : "❌ Invalide");
          console.log("User UID:", user.uid);
          console.log("User email:", user.email);
          
          // TODO: Vérifier le rôle de l'utilisateur
          // Pour l'instant, on accepte tous les utilisateurs connectés
          // Plus tard, on vérifiera si l'utilisateur a le rôle 'shop'
        } catch (error) {
          console.error("Erreur lors de l'obtention du token:", error);
        }
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) { setClients([]); return; }
      try {
        const res = await apiAuthGet<Client[]>(`/clients?query=${encodeURIComponent(q)}`);
        if (active) setClients(res);
      } catch (e:any) { 
        console.error("Erreur recherche clients:", e);
        if (e.message?.includes("Session expirée") || e.message?.includes("401")) {
          setMsg("Session expirée - redirection vers la connexion...");
          // Rediriger immédiatement vers la page de login
          setTimeout(() => {
            router.replace('/login?role=shop');
          }, 2000);
        } else if (e.message?.includes("Serveur injoignable")) {
          setMsg("Serveur injoignable - vérifiez votre connexion");
        }
      }
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

  // Afficher un loading si pas encore authentifié
  if (loading) {
    return (
      <ShopLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
          </div>
        </div>
      </ShopLayout>
    );
  }

  // Si pas connecté, ne pas afficher le contenu (redirection en cours)
  if (!user) {
    return null;
  }

  return (
    <ShopLayout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="max-w-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Nouvelle Livraison</h1>
              <p className="mt-2 text-gray-600">Créer une nouvelle livraison pour un client</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-6">
                {/* Recherche client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rechercher un client
                  </label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Tapez le nom du client..." 
                    value={query} 
                    onChange={(e)=>{ setQuery(e.target.value); setSelected(""); setSelectedData(null); }} 
                  />
                  {query.length > 0 && query.length < 2 && (
                    <p className="mt-1 text-sm text-gray-500">
                      Tapez au moins 2 caractères pour rechercher
                    </p>
                  )}
                  {clients.length>0 && (
                    <div className="mt-2 border rounded-md max-h-48 overflow-auto bg-white shadow-lg">
                      {clients.map(c=> (
                        <button
                          key={c.id}
                          type="button"
                          className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${selected===c.id? 'bg-blue-50 text-blue-700':''}`}
                          onClick={()=>{ setSelected(c.id); setSelectedData(c); setClients([]); setQuery(`${c.firstName} ${c.lastName}`); }}
                        >
                          <div className="font-medium">{c.firstName} {c.lastName}</div>
                          {c.address && (
                            <div className="text-sm text-gray-600">
                              {c.address.street} {c.address.streetNumber}, {c.address.zip} {c.address.city}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Informations de livraison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employé(e) *
                    </label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Nom de l'employé" 
                      value={form.employee} 
                      onChange={e=>setForm({...form, employee:e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secteur
                    </label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Secteur (optionnel)" 
                      value={form.sector} 
                      onChange={e=>setForm({...form, sector:e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° Ticket
                    </label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="N° ticket (optionnel)" 
                      value={form.ticketNo} 
                      onChange={e=>setForm({...form, ticketNo:e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant (CHF)
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Montant (optionnel)" 
                      value={form.amount} 
                      onChange={e=>setForm({...form, amount:e.target.value})} 
                    />
                  </div>
                </div>

                {/* Date et heure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de livraison *
                    </label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      type="date" 
                      value={form.date} 
                      onChange={e=>setForm({...form, date:e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heure de livraison *
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      value={form.time} 
                      onChange={e=>setForm({...form, time: e.target.value})}
                    >
                      {generateTimeOptions().map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sacs et notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de sacs *
                    </label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Nombre de sacs" 
                      type="number" 
                      min={1} 
                      max={20} 
                      value={form.bags} 
                      onChange={e=>setForm({...form, bags: Number(e.target.value)})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes coursier
                    </label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Notes pour le coursier (optionnel)" 
                      value={form.courierNotes} 
                      onChange={e=>setForm({...form, courierNotes: e.target.value})} 
                    />
                  </div>
                </div>
                {/* Bouton de soumission */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button 
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={busy} 
                    onClick={submit}
                  >
                    {busy ? 'Création...' : 'Créer la livraison'}
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            {msg && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
                {msg}
              </div>
            )}

            {/* Message d'information pour la connexion */}
            {!query && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Connexion requise
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Pour rechercher des clients, vous devez d'abord vous connecter.</p>
                      <p className="mt-1">
                        <a href="/login" className="font-medium underline hover:text-blue-600">
                          Cliquez ici pour vous connecter
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Détails du client sélectionné */}
            {selectedClient && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Client sélectionné</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{selectedClient.firstName} {selectedClient.lastName}</div>
                    {selectedClient.address && (
                      <div className="text-gray-600">
                        {selectedClient.address.street} {selectedClient.address.streetNumber}<br />
                        {selectedClient.address.zip} {selectedClient.address.city}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {selectedClient.floor && <div><span className="font-medium">Étage:</span> {selectedClient.floor}</div>}
                    {selectedClient.entryCode && <div><span className="font-medium">Code:</span> {selectedClient.entryCode}</div>}
                    {selectedClient.phone && <div><span className="font-medium">Tél:</span> {selectedClient.phone}</div>}
                    {selectedClient.email && <div><span className="font-medium">Email:</span> {selectedClient.email}</div>}
                    {typeof selectedClient.cms === 'boolean' && (
                      <div>
                        <span className="font-medium">CMS:</span> 
                        <span className={`ml-1 px-2 py-1 rounded-full text-xs ${selectedClient.cms ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {selectedClient.cms ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}


