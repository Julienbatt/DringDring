"use client";
import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import { getHqDashboard, exportHqToSheets, listChains, listShopsSimple } from "@/lib/api";
import { showToast } from "@/lib/toast";

const CANTONS = ['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'];

export default function HqDashboardPage(){
  const [chainId, setChainId] = useState('migros');
  const [regionId, setRegionId] = useState('VS');
  const [chains, setChains] = useState<string[]>([]);
  const [shops, setShops] = useState<{id:string; name?:string}[]>([]);
  const [dash, setDash] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState({ spreadsheetId: '', sheetName: 'Livraisons' });

  async function load(){
    try{ setBusy(true); const d = await getHqDashboard(chainId, regionId); setDash(d); showToast('Stats HQ chargées','success'); }
    catch(e:any){ showToast(e.message || 'Erreur HQ','error'); }
    finally{ setBusy(false); }
  }

  async function exportCsv(){
    try{ setBusy(true); const out = await exportHqToSheets(chainId, regionId, sheet.spreadsheetId, sheet.sheetName); showToast(`Exporté: ${out.rows} lignes`,'success'); }
    catch(e:any){ showToast(e.message || 'Erreur export HQ','error'); }
    finally{ setBusy(false); }
  }

  async function refreshMeta(){
    try{
      const cs = await listChains(regionId); setChains(cs);
      const ss = await listShopsSimple(); setShops(ss);
    }catch{}
  }

  return (
    <AuthGate>
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">HQ Dashboard</h1>
        <div className="flex items-center gap-3">
          <select className="border p-2" value={chainId} onChange={e=>setChainId(e.target.value)} onFocus={refreshMeta}>
            <option value="migros">migros</option>
            {chains.filter(c=>c!=='migros').map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="border p-2" value={regionId} onChange={e=>setRegionId(e.target.value)}>
            {CANTONS.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="px-3 py-2 border rounded" onClick={load} disabled={busy}>{busy? 'Chargement...' : 'Charger les stats'}</button>
        </div>

        {dash && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Aujourd'hui</h3>
                <div>Livraisons: <b>{dash.today?.deliveries ?? 0}</b></div>
                <div>Sacs: <b>{dash.today?.totalBags ?? 0}</b></div>
                <div>Montant: <b>{(dash.today?.totalAmount ?? 0).toLocaleString('fr-CH',{minimumFractionDigits:2, maximumFractionDigits:2})}</b></div>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Semaine</h3>
                <div>Livraisons: <b>{dash.week?.deliveries ?? 0}</b></div>
                <div>Sacs: <b>{dash.week?.totalBags ?? 0}</b></div>
                <div>Montant: <b>{(dash.week?.totalAmount ?? 0).toLocaleString('fr-CH',{minimumFractionDigits:2, maximumFractionDigits:2})}</b></div>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Mois</h3>
                <div>Livraisons: <b>{dash.month?.deliveries ?? 0}</b></div>
                <div>Sacs: <b>{dash.month?.totalBags ?? 0}</b></div>
                <div>Montant: <b>{(dash.month?.totalAmount ?? 0).toLocaleString('fr-CH',{minimumFractionDigits:2, maximumFractionDigits:2})}</b></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Top employé(e)s</h3>
                <ul className="text-sm list-disc pl-5">{dash.topEmployees?.map((t:any)=> <li key={t.name}>{t.name}: {t.deliveries}</li>)}</ul>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Top secteurs</h3>
                <ul className="text-sm list-disc pl-5">{dash.topSectors?.map((t:any)=> <li key={t.name}>{t.name}: {t.deliveries}</li>)}</ul>
              </div>
            </div>

            <div className="text-xs text-gray-500">Dernière mise à jour: {dash.lastUpdated}</div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="font-semibold">Export Google Sheets (HQ)</h2>
          <div className="flex items-center gap-2">
            <input className="border p-2 w-96" placeholder="Spreadsheet ID" value={sheet.spreadsheetId} onChange={e=>setSheet({...sheet, spreadsheetId:e.target.value})} />
            <input className="border p-2" placeholder="Sheet name" value={sheet.sheetName} onChange={e=>setSheet({...sheet, sheetName:e.target.value})} />
            <button className="px-3 py-2 border rounded" onClick={exportCsv} disabled={busy || !sheet.spreadsheetId}>{busy? 'Export...' : 'Exporter'}</button>
          </div>
          <div>
            <button className="px-3 py-2 border rounded" onClick={refreshMeta}>Voir magasins rattachés</button>
            {shops.length>0 && (
              <ul className="mt-2 text-sm list-disc pl-5">
                {shops.filter(s=>s).map(s=> <li key={s.id}>{s.name || s.id}</li>)}
              </ul>
            )}
          </div>
        </section>
      </main>
    </AuthGate>
  );
}


