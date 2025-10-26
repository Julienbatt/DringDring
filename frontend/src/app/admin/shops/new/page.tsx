"use client";
import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import { createShop } from "@/lib/api";
import { showToast } from "@/lib/toast";
import PricingConfig, { PricingConfig as PricingConfigType } from "@/components/PricingConfig";

const CANTONS = ['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'];

export default function NewShopPage(){
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    street: '', streetNumber: '', zip: '', city: '',
    spreadsheetId: '', sheetName: 'Clients - Historique des transactions',
    regionId: '' as string | ''
  });
  const [pricing, setPricing] = useState<PricingConfigType | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(){
    try{
      setBusy(true);
      const body = {
        name: form.name,
        address: { street: form.street, streetNumber: form.streetNumber, zip: form.zip, city: form.city },
        email: form.email,
        phone: form.phone,
        contacts: [],
        departments: [],
        spreadsheetId: form.spreadsheetId || undefined,
        sheetName: form.sheetName || undefined,
        regionId: form.regionId || undefined,
        pricing: pricing || undefined,
      };
      const res = await createShop(body);
      showToast(`Shop créé: ${res.id}`, 'success');
      setForm({ name:'', email:'', phone:'', street:'', streetNumber:'', zip:'', city:'', spreadsheetId:'', sheetName:'Clients - Historique des transactions', regionId:'' });
      setPricing(null);
    }catch(e:any){ showToast(e.message || 'Erreur création', 'error'); }
    finally{ setBusy(false); }
  }

  return (
    <AuthGate>
      <main className="p-6 space-y-4 max-w-3xl">
        <h1 className="text-2xl font-bold">Admin · Nouveau shop</h1>

        <div className="grid grid-cols-2 gap-3">
          <input className="border p-2 col-span-2" placeholder="Nom" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="border p-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <input className="border p-2" placeholder="Téléphone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />

          <input className="border p-2" placeholder="Rue" value={form.street} onChange={e=>setForm({...form, street:e.target.value})} />
          <input className="border p-2" placeholder="N°" value={form.streetNumber} onChange={e=>setForm({...form, streetNumber:e.target.value})} />
          <input className="border p-2" placeholder="NPA" value={form.zip} onChange={e=>setForm({...form, zip:e.target.value})} />
          <input className="border p-2" placeholder="Localité" value={form.city} onChange={e=>setForm({...form, city:e.target.value})} />

          <input className="border p-2 col-span-2" placeholder="Spreadsheet ID (optionnel)" value={form.spreadsheetId} onChange={e=>setForm({...form, spreadsheetId:e.target.value})} />
          <input className="border p-2 col-span-2" placeholder="Nom de feuille (optionnel)" value={form.sheetName} onChange={e=>setForm({...form, sheetName:e.target.value})} />

          <div className="col-span-2 flex items-center gap-2">
            <label className="text-sm text-gray-600">Canton</label>
            <select className="border p-2" value={form.regionId} onChange={e=>setForm({...form, regionId:e.target.value})}>
              <option value="">(aucun)</option>
              {CANTONS.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <PricingConfig
          initialConfig={pricing || undefined}
          onSave={async (config) => {
            setPricing(config);
            showToast("Configuration de tarification sauvegardée", "success");
          }}
        />

        <button className="px-4 py-2 border rounded disabled:opacity-50" disabled={busy} onClick={submit}>{busy? 'Création...' : 'Créer le shop'}</button>
      </main>
    </AuthGate>
  );
}




