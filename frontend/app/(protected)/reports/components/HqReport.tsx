'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useHqBilling } from '../../hq/hooks/useHqBilling'
import { useHqBillingShops } from '../../hq/hooks/useHqBillingShops'
import { useHqStats } from '../../hq/hooks/useHqStats'
import { API_BASE_URL } from '@/lib/api'
import { useEcoStats } from '@/app/(protected)/hooks/useEcoStats'
import { useAuth } from '@/app/(protected)/providers/AuthProvider'
import { toast } from 'sonner'

function formatCHF(value: number) {
  return `CHF ${value.toLocaleString('fr-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatMonth(value: unknown) {
  if (!value) return ''
  const asText = String(value)
  const normalized = asText.length === 7 ? `${asText}-01` : asText
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })
}

function getCurrentMonth() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

const MONEY_COLUMNS = new Set(['total_subvention_due', 'total_volume_chf'])

const DETAIL_COLUMNS = [
  'shop_name',
  'city_name',
  'total_deliveries',
  'total_subvention_due',
  'total_volume_chf',
]
const DETAIL_COLUMNS_WITH_ACTIONS = [...DETAIL_COLUMNS, 'actions']

const DETAIL_COLUMN_LABELS: Record<string, string> = {
  shop_name: 'Commerce',
  city_name: 'Commune partenaire',
  total_deliveries: 'Livraisons',
  total_subvention_due: 'Montant HQ (CHF)',
  total_volume_chf: 'Total CHF',
  actions: 'Action',
}

async function downloadCsv(path: string, filename: string) {
  const supabase = createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session) return

  const apiUrl = API_BASE_URL

  const res = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', extractFilename(res) ?? filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function downloadPdf(path: string, filename: string) {
  const supabase = createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session) return

  const apiUrl = API_BASE_URL

  const res = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 409 && text.includes('not frozen')) {
      toast.info('Periode non validee pour tous les commerces')
      return
    }
    throw new Error(`Export failed: ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', extractFilename(res) ?? filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function extractFilename(res: Response) {
  const disposition = res.headers.get('content-disposition')
  if (!disposition) return null
  const match = disposition.match(/filename=\"?([^\"]+)\"?/)
  return match ? match[1] : null
}

export default function HqReport() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const paramMonth = searchParams.get('month')
  const [selectedMonth, setSelectedMonth] = useState(
    paramMonth ?? getCurrentMonth()
  )
  const { data: ecoStats, loading: ecoLoading } = useEcoStats(selectedMonth)
  const { user } = useAuth()
  const {
    data: hqStats,
    loading: hqStatsLoading,
    error: hqStatsError,
  } = useHqStats(selectedMonth)

  const { data, loading, error } = useHqBilling(selectedMonth)
  const { data: shopData, loading: shopLoading, error: shopError } =
    useHqBillingShops(selectedMonth)

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  if (loading || shopLoading) {
    return <div className="p-8">Chargement...</div>
  }
  if (error || shopError) {
    return <div className="p-8 text-red-600">{error ?? shopError}</div>
  }
  const summaryRows = Array.isArray(data) ? data : data?.rows ?? []
  const filteredRows =
    user?.hq_id && Array.isArray(summaryRows)
      ? summaryRows.filter((row) => row.hq_id === user.hq_id)
      : summaryRows
  const summaryMonth = Array.isArray(data) ? selectedMonth : data?.month ?? selectedMonth

  if (!filteredRows || filteredRows.length === 0) {
    return <div className="p-8">Aucune donnee</div>
  }

  const totalDeliveries = filteredRows.reduce(
    (sum, row) => sum + Number(row.total_deliveries ?? 0),
    0
  )

  const totalSubvention = filteredRows.reduce(
    (sum, row) => sum + Number(row.total_subvention_due ?? 0),
    0
  )

  const totalVolume = filteredRows.reduce(
    (sum, row) => sum + Number(row.total_volume_chf ?? 0),
    0
  )
  const averageSubventionPerDelivery =
    totalDeliveries > 0
      ? (hqStats?.total_subvention_chf ?? totalSubvention) / totalDeliveries
      : 0
  const totalBasketValue = hqStats?.total_basket_value_chf ?? 0
  const averageBasketValue = hqStats?.average_basket_value_chf ?? 0

  const hqName = filteredRows[0]?.hq_name ?? filteredRows[0]?.hq_id ?? 'Groupe'
  const detailRows = shopData ?? []
  const topShops = [...detailRows]
    .sort((a, b) => Number(b.total_deliveries ?? 0) - Number(a.total_deliveries ?? 0))
    .slice(0, 3)

  const handleExport = async () => {
    await downloadCsv(
      `/reports/hq-billing/export?month=${encodeURIComponent(selectedMonth)}`,
      'facturation-groupe.csv'
    )
  }

  const handleHqPdf = async () => {
    const safeHq = hqName.replace(/[^a-zA-Z0-9_-]+/g, '_')
    await downloadPdf(
      `/reports/hq-monthly-pdf?month=${encodeURIComponent(selectedMonth)}&allow_unfrozen=1`,
      `DringDring_HQ_${safeHq}_${selectedMonth}.pdf`
    )
  }

  const handlePdf = async (shopId: string, shopName?: string) => {
    const safeName = shopName ? shopName.replace(/[^a-zA-Z0-9_-]+/g, '_') : 'commerce'
    await downloadPdf(
      `/reports/shop-monthly-pdf?shop_id=${encodeURIComponent(
        shopId
      )}&month=${encodeURIComponent(selectedMonth)}`,
      `DringDring_Commerce_${safeName}_${selectedMonth}.pdf`
    )
  }

  return (
    <div className="p-8 space-y-8">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Facturation - Groupe {hqName}
          </h1>
          <p className="text-sm text-gray-500">
            Periode : {formatMonth(summaryMonth)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="hq-month">
            Mois
          </label>
          <input
            id="hq-month"
            type="month"
            className="border rounded px-2 py-1 text-sm"
            value={selectedMonth}
            onChange={(event) => handleMonthChange(event.target.value)}
          />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Livraisons</div>
          <div className="text-2xl font-semibold">{totalDeliveries}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Montant HQ</div>
          <div className="text-2xl font-semibold">
            {formatCHF(totalSubvention)}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Volume total</div>
          <div className="text-2xl font-semibold">
            {formatCHF(totalVolume)}
          </div>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="text-sm font-medium text-gray-700">Top commerces du mois</div>
        {topShops.length === 0 ? (
          <div className="text-sm text-gray-500 mt-2">Aucun commerce actif.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {topShops.map((shop) => (
              <div key={shop.shop_id} className="flex items-center justify-between text-sm">
                <div className="text-gray-700">{shop.shop_name}</div>
                <div className="font-medium text-gray-900">{shop.total_deliveries} livraisons</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-700">
          Valeur pour le groupe
        </h2>
        {hqStatsLoading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : hqStatsError ? (
          <div className="text-sm text-red-600">{hqStatsError}</div>
        ) : hqStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Clients servis</div>
              <div className="text-2xl font-semibold">{hqStats.unique_clients}</div>
              <div className="text-xs text-gray-400">Menages servis</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Commerces actifs</div>
              <div className="text-2xl font-semibold">{hqStats.active_shops}</div>
              <div className="text-xs text-gray-400">Ce mois</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Communes couvertes</div>
              <div className="text-2xl font-semibold">{hqStats.active_cities}</div>
              <div className="text-xs text-gray-400">Réseau local</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Subvention / livraison</div>
              <div className="text-2xl font-semibold">
                {formatCHF(averageSubventionPerDelivery)}
              </div>
              <div className="text-xs text-gray-400">Moyenne du mois</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Montant des courses</div>
              <div className="text-2xl font-semibold">
                {formatCHF(totalBasketValue)}
              </div>
              <div className="text-xs text-gray-400">
                Panier moyen: {formatCHF(averageBasketValue)}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Sacs livres</div>
          <div className="text-2xl font-semibold">
            {hqStatsLoading || !hqStats ? '-' : hqStats.total_bags}
          </div>
          <div className="text-xs text-gray-400">
            {hqStatsLoading || !hqStats ? '' : `Moyenne: ${hqStats.average_bags.toFixed(1)}`}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Jours actifs</div>
          <div className="text-2xl font-semibold">
            {hqStatsLoading || !hqStats ? '-' : hqStats.active_days}
          </div>
          <div className="text-xs text-gray-400">Mois en cours</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Livraisons / jour</div>
          <div className="text-2xl font-semibold">
            {hqStatsLoading || !hqStats ? '-' : hqStats.deliveries_per_active_day.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400">Jours actifs</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Evolution livraisons</div>
          <div className="text-2xl font-semibold">
            {hqStatsLoading || !hqStats
              ? '-'
              : `${hqStats.deliveries_change_pct === null ? 'n/a' : `${hqStats.deliveries_change_pct > 0 ? '+' : ''}${hqStats.deliveries_change_pct.toFixed(1)}%`}`}
          </div>
          <div className="text-xs text-gray-400">
            {hqStatsLoading || !hqStats ? '' : `Vs ${hqStats.previous_month}`}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Km a velo (mois)</div>
          <div className="text-2xl font-semibold">
            {ecoLoading || !ecoStats ? '-' : ecoStats.distance_km.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400">Estimation aller-retour</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">CO2 economise (kg)</div>
          <div className="text-2xl font-semibold">
            {ecoLoading || !ecoStats ? '-' : ecoStats.co2_saved_kg.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400">Base voiture 93.6 g/km</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            Detail par commerce
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              className="text-sm text-blue-600 hover:underline"
            >
              Exporter CSV
            </button>
            <button
              onClick={handleHqPdf}
              className="text-sm text-blue-600 hover:underline"
            >
              Telecharger PDF
            </button>
          </div>
        </div>
        {detailRows.length === 0 ? (
          <div className="text-sm text-gray-500">Aucun detail disponible.</div>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {DETAIL_COLUMNS_WITH_ACTIONS.map((col) => (
                    <th
                      key={col}
                      className="border px-3 py-2 text-left font-medium text-gray-700"
                    >
                      {DETAIL_COLUMN_LABELS[col] ?? col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {detailRows.map((row, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    {DETAIL_COLUMNS_WITH_ACTIONS.map((col) => {
                      if (col === 'actions') {
                        const shopId = row.shop_id
                        const isAvailable = Boolean(row.is_frozen)
                        return (
                          <td
                            key={col}
                            className="border px-3 py-2 whitespace-nowrap"
                          >
                            <button
                              className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                              disabled={!shopId || !isAvailable}
                              onClick={() =>
                                handlePdf(String(shopId), row.shop_name)
                              }
                              title={
                                isAvailable
                                  ? 'Exporter le PDF'
                                  : 'Document indisponible'
                              }
                            >
                              Telecharger PDF
                            </button>
                          </td>
                        )
                      }

                      const value = row[col]
                      return (
                        <td
                          key={col}
                          className="border px-3 py-2 whitespace-nowrap"
                        >
                          {typeof value === 'number' && MONEY_COLUMNS.has(col)
                            ? formatCHF(value)
                            : String(value ?? '')}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
