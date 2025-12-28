'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useHqBilling } from '../../hq/hooks/useHqBilling'
import { useHqBillingShops } from '../../hq/hooks/useHqBillingShops'

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
  city_name: 'Ville',
  total_deliveries: 'Livraisons',
  total_subvention_due: 'Subvention (CHF)',
  total_volume_chf: 'Total CHF',
  actions: 'Action',
}

async function downloadCsv(path: string, filename: string) {
  const supabase = createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session) return

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return

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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return

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
  const [freezeLoading, setFreezeLoading] = useState<string | null>(null)
  const [freezeError, setFreezeError] = useState<string | null>(null)
  const [freezeSuccess, setFreezeSuccess] = useState<string | null>(null)

  const { data, loading, error } = useHqBilling(selectedMonth)
  const {
    data: shopData,
    loading: shopLoading,
    error: shopError,
    refresh: refreshShops,
  } = useHqBillingShops(selectedMonth)

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
  if (!data || data.length === 0) {
    return <div className="p-8">Aucune donnee</div>
  }

  const totalDeliveries = data.reduce(
    (sum, row) => sum + Number(row.total_deliveries ?? 0),
    0
  )

  const totalSubvention = data.reduce(
    (sum, row) => sum + Number(row.total_subvention_due ?? 0),
    0
  )

  const totalVolume = data.reduce(
    (sum, row) => sum + Number(row.total_volume_chf ?? 0),
    0
  )

  const hqName = data[0]?.hq_name ?? data[0]?.hq_id ?? 'Groupe'
  const detailRows = shopData ?? []

  const handleExport = async () => {
    await downloadCsv(
      `/reports/hq-billing/export?month=${encodeURIComponent(selectedMonth)}`,
      'facturation-groupe.csv'
    )
  }

  const handleHqPdf = async () => {
    const safeHq = hqName.replace(/[^a-zA-Z0-9_-]+/g, '_')
    await downloadPdf(
      `/reports/hq-monthly-pdf?month=${encodeURIComponent(selectedMonth)}`,
      `DringDring_HQ_${safeHq}_${selectedMonth}_FROZEN.pdf`
    )
  }

  const handlePdf = async (shopId: string, shopName?: string) => {
    const safeName = shopName ? shopName.replace(/[^a-zA-Z0-9_-]+/g, '_') : 'shop'
    await downloadPdf(
      `/reports/shop-monthly-pdf?shop_id=${encodeURIComponent(
        shopId
      )}&month=${encodeURIComponent(selectedMonth)}`,
      `DringDring_Shop_${safeName}_${selectedMonth}_FROZEN.pdf`
    )
  }

  const handleFreeze = async (shopId: string) => {
    try {
      setFreezeLoading(shopId)
      setFreezeError(null)
      setFreezeSuccess(null)

      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) {
        setFreezeError('Session inexistante')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        setFreezeError('API_URL manquant')
        return
      }

      const query = new URLSearchParams({
        shop_id: shopId,
        month: selectedMonth,
      })
      const res = await fetch(
        `${apiUrl}/deliveries/shop/freeze?${query.toString()}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      if (!res.ok) {
        throw new Error(`Freeze failed: ${res.status}`)
      }

      setFreezeSuccess('Periode gelee')
      await refreshShops()
    } catch (e: any) {
      setFreezeError('Impossible de geler la periode')
    } finally {
      setFreezeLoading(null)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Facturation - Groupe {hqName}
          </h1>
          <p className="text-sm text-gray-500">
            Periode : {formatMonth(selectedMonth)}
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
          <div className="text-sm text-gray-500">Subvention communale</div>
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
        {freezeError && (
          <div className="text-sm text-red-600">{freezeError}</div>
        )}
        {freezeSuccess && (
          <div className="text-sm text-green-600">{freezeSuccess}</div>
        )}

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
                        const isFrozen = Boolean(row.is_frozen)
                        const disabled =
                          !shopId || freezeLoading === shopId || isFrozen
                        return (
                          <td
                            key={col}
                            className="border px-3 py-2 whitespace-nowrap"
                          >
                            {isFrozen && (
                              <div className="mb-1 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                                Periode gelee
                              </div>
                            )}
                            <button
                              className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                              disabled={disabled}
                              onClick={() => handleFreeze(String(shopId))}
                              title={
                                shopId
                                  ? isFrozen
                                    ? 'Periode deja gelee'
                                    : 'Geler la periode'
                                  : 'Shop id indisponible'
                              }
                            >
                              {freezeLoading === shopId
                                ? 'Gel...'
                                : isFrozen
                                ? 'Periode gelee'
                                : 'Geler ce mois'}
                            </button>
                            <div className="mt-1">
                              <button
                                className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                                disabled={!shopId || !isFrozen}
                                onClick={() =>
                                  handlePdf(String(shopId), row.shop_name)
                                }
                                title={
                                  isFrozen
                                    ? 'Exporter le PDF'
                                    : 'Periode non gelee'
                                }
                              >
                                Telecharger PDF
                              </button>
                            </div>
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
