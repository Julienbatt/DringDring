'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ClientAutocomplete from '@/components/ClientAutocomplete'
import { createClient } from '@/lib/supabase/client'
import { apiPost, apiGet } from '@/lib/api'
import { useShopClients } from '../hooks/useShopClients'
import { useShopDeliveries } from '../hooks/useShopDeliveries'
import { useShopPeriods } from '../hooks/useShopPeriods'

function getCurrentMonth() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function getToday() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatCHF(value: number | null) {
  if (value === null || Number.isNaN(value)) return ''
  return `CHF ${value.toLocaleString('fr-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value: unknown) {
  if (!value) return ''
  const asText = String(value)
  return asText.slice(0, 10)
}

type PreviewResult = {
  total_price: string
  share_client: string
  share_shop: string
  share_city: string
  share_admin_region?: string
}

function formatMonth(value: unknown) {
  if (!value) return ''
  const asText = String(value)
  const normalized = asText.length === 7 ? `${asText}-01` : asText
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })
}

const TABLE_COLUMNS = [
  'delivery_date',
  'client_name',
  'address',
  'city_name',
  'bags',
  'status',
  'total_price',
  'share_shop',
]

const TABLE_LABELS: Record<string, string> = {
  delivery_date: 'Date',
  client_name: 'Client',
  address: 'Adresse',
  city_name: 'Ville',
  bags: 'Sacs',
  status: 'Statut',
  total_price: 'Total CHF',
  share_shop: 'Part shop',
}

type FormState = {
  client_id: string
  delivery_date: string
  time_window: string
  bags: string | number
  order_amount: string | number
  [key: string]: any
}

export default function ShopReport() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const paramMonth = searchParams.get('month')
  const [selectedMonth, setSelectedMonth] = useState(
    paramMonth ?? getCurrentMonth()
  )

  const [formState, setFormState] = useState<FormState>({
    client_id: '',
    delivery_date: getToday(),
    time_window: '',
    bags: '',
    order_amount: '',
  })
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    data: deliveries,
    isFrozen,
    loading,
    error,
    refresh,
  } = useShopDeliveries(selectedMonth)
  const {
    data: periods,
    loading: periodsLoading,
    error: periodsError,
  } = useShopPeriods()
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
  } = useShopClients()

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)

    // [NEW] Sync delivery date with selected month
    setFormState((prev) => ({
      ...prev,
      delivery_date: `${value}-01`,
    }))

    const params = new URLSearchParams(searchParams.toString())
    params.set('month', value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = event.target
    const { name, value } = target
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormState((prev) => ({
        ...prev,
        [name]: target.checked,
      }))
      return
    }
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  useEffect(() => {
    const bagCount = Number(formState.bags)

    // [NEW] Block preview if frozen
    if (isFrozen) {
      setPreview(null)
      setPreviewError(null)
      return
    }

    if (!formState.client_id || Number.isNaN(bagCount) || bagCount < 1) {
      setPreview(null)
      setPreviewError(null)
      return
    }

    let active = true
    setPreviewLoading(true)
    setPreviewError(null)

    const load = async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const session = sessionData.session
        if (!session) {
          setPreviewError('Session inexistante')
          setPreview(null)
          return
        }

        const payload = {
          client_id: formState.client_id,
          delivery_date: formState.delivery_date,
          time_window: formState.time_window || '08:00-12:00',
          bags: bagCount,
          order_amount: formState.order_amount ? Number(formState.order_amount) : null,
        }

        const result = await apiPost(
          '/deliveries/shop/preview',
          payload,
          session.access_token
        )

        if (!active) return
        setPreview(result as PreviewResult)
      } catch (e: any) {
        if (!active) return
        setPreviewError('Impossible de calculer le montant')
        setPreview(null)
      } finally {
        if (active) setPreviewLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [
    formState.client_id,
    formState.bags,
    formState.delivery_date,
    isFrozen, // Dependency added
  ])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const bagCount = Number(formState.bags)
    if (isFrozen) {
      setSubmitError('Cette periode est gelee')
      setSubmitting(false)
      return
    }
    if (!formState.client_id) {
      setSubmitError('Veuillez selectionner un client valide dans la liste')
      setSubmitting(false)
      return
    }
    if (Number.isNaN(bagCount) || bagCount < 1) {
      setSubmitError('Veuillez selectionner un nombre de sacs valide')
      setSubmitting(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) {
        setSubmitError('Session inexistante')
        return
      }

      const payload = {
        client_id: formState.client_id,
        delivery_date: formState.delivery_date,
        time_window: formState.time_window,
        bags: bagCount,
        order_amount: formState.order_amount ? Number(formState.order_amount) : null,
      }

      await apiPost('/deliveries/shop', payload, session.access_token)
      setFormState((prev) => ({
        ...prev,
        client_id: '',
        time_window: '',
        bags: '',
        order_amount: '',
      }))
      await refresh()
    } catch (e: any) {
      setSubmitError('Impossible de creer la livraison')
    } finally {
      setSubmitting(false)
    }
  }

  const [tariffType, setTariffType] = useState<'bags' | 'order_amount' | null>(null)

  useEffect(() => {
    // Fetch shop configuration on mount
    const fetchConfig = async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) return

        const config = await apiGet('/deliveries/shop/configuration', sessionData.session.access_token) as { rule_type: string }
        setTariffType(config.rule_type as any)
      } catch (e) {
        console.error('Failed to load shop config', e)
      }
    }
    fetchConfig()
  }, [])

  const selectedClient = (clients ?? []).find(
    (client) => client.id === formState.client_id
  )

  // [NEW] Find current period freeze details
  const currentFrozenPeriod = (periods ?? []).find(
    (p) => String(p.period_month).startsWith(selectedMonth)
  )

  return (
    <div className="p-8 space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Livraisons - Shop</h1>
          {isFrozen && (
            <div className="flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1">
              <span className="text-xs font-medium text-orange-700">Periode gelee</span>
              {currentFrozenPeriod && (
                <>
                  <span className="text-xs text-orange-600">
                    (par {currentFrozenPeriod.frozen_by_name || 'Admin'} le {formatDate(currentFrozenPeriod.frozen_at)})
                  </span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/reports/shop-monthly-pdf?shop_id=${currentFrozenPeriod.shop_id || ''}&month=${selectedMonth}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                    PDF
                  </a>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="shop-month">
            Mois
          </label>
          <input
            id="shop-month"
            type="month"
            className="border rounded px-2 py-1 text-sm"
            value={selectedMonth}
            onChange={(event) => handleMonthChange(event.target.value)}
          />
        </div>
      </header>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="text-sm font-medium text-gray-700">
          Enregistrer une livraison
        </h2>

        {isFrozen && (
          <div className="text-sm text-orange-600">
            Periode gelee : creation et simulation de livraisons desactivees.
          </div>
        )}
        {submitError && (
          <div className="text-sm text-red-600">{submitError}</div>
        )}
        {clientsError && (
          <div className="text-sm text-red-600">{clientsError}</div>
        )}

        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm text-gray-600 md:col-span-2">
            Client
            <ClientAutocomplete
              clients={clients ?? []}
              value={formState.client_id}
              onChange={(clientId) => {
                setFormState((prev) => ({
                  ...prev,
                  client_id: clientId,
                }))
              }}
              placeholder={clientsLoading ? 'Chargement...' : 'Rechercher un client'}
            />
          </label>
          {selectedClient && (
            <div className="md:col-span-2 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium">{selectedClient.name}</div>
              <div>
                {selectedClient.address ?? ''}{' '}
                {selectedClient.postal_code ?? ''} {selectedClient.city_name ?? ''}
              </div>
              <div>{selectedClient.is_cms ? 'Client CMS' : 'Client standard'}</div>
            </div>
          )}
          <label className="text-sm text-gray-600">
            Date
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="date"
              name="delivery_date"
              value={formState.delivery_date}
              onChange={handleChange}
              required
            />
          </label>
          <label className="text-sm text-gray-600">
            Plage horaire
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              name="time_window"
              value={formState.time_window}
              onChange={handleChange}
              required
            >
              <option value="">Selectionner</option>
              <option value="08:00-12:00">08:00-12:00</option>
              <option value="12:00-16:00">12:00-16:00</option>
              <option value="16:00-20:00">16:00-20:00</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Sacs
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              name="bags"
              value={formState.bags}
              onChange={handleChange}
              required
            >
              <option value="">Selectionner</option>
              {Array.from({ length: 20 }, (_, index) => index + 1).map(
                (count) => (
                  <option key={count} value={count}>
                    {count} sac{count > 1 ? 's' : ''}
                  </option>
                )
              )}
            </select>
          </label>

          {tariffType === 'order_amount' && (
            <label className="text-sm text-gray-600">
              Montant Commande (CHF)
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                type="number"
                step="0.05"
                name="order_amount"
                value={formState.order_amount || ''}
                onChange={handleChange}
                required
              />
            </label>
          )}

          <label className="text-sm text-gray-600 flex items-center gap-2">
            <input
              type="checkbox"
              name="is_cms"
              checked={Boolean(selectedClient?.is_cms)}
              disabled
            />
            Client CMS
          </label>
          {previewError && (
            <div className="md:col-span-2 text-sm text-red-600">
              {previewError}
            </div>
          )}
          {previewLoading && (
            <div className="md:col-span-2 text-sm text-gray-500">
              Calcul du montant...
            </div>
          )}
          {preview && !previewLoading && (
            <div className="md:col-span-2 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium">Estimation</div>
              <div>
                Total livraison :{' '}
                <span className="font-semibold">
                  {formatCHF(Number(preview.total_price))}
                </span>
              </div>
              <div>Part shop : {formatCHF(Number(preview.share_shop))}</div>
              <div>Part client : {formatCHF(Number(preview.share_client))}</div>
              <div>Part ville : {formatCHF(Number(preview.share_city))}</div>
            </div>
          )}
          <div className="md:col-span-2">
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={submitting || !preview || isFrozen}
            >
              {submitting ? 'Enregistrement...' : 'Creer la livraison'}
            </button>
          </div>
        </form>
      </section >

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-700">
          Historique des livraisons
        </h2>

        {loading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : deliveries && deliveries.length > 0 ? (
          <div className="overflow-auto border rounded">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="border px-3 py-2 text-left font-medium text-gray-700"
                    >
                      {TABLE_LABELS[col] ?? col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row, index) => (
                  <tr key={index} className="odd:bg-white even:bg-gray-50">
                    {TABLE_COLUMNS.map((col) => {
                      const value = row[col]
                      const cell =
                        col === 'total_price' || col === 'share_shop'
                          ? formatCHF(Number(value))
                          : col === 'delivery_date'
                            ? formatDate(value)
                            : String(value ?? '')
                      return (
                        <td
                          key={col}
                          className="border px-3 py-2 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Aucune livraison.</div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-700">
          Periodes gelees
        </h2>

        {periodsLoading ? (
          <div className="text-sm text-gray-500">Chargement...</div>
        ) : periodsError ? (
          <div className="text-sm text-red-600">{periodsError}</div>
        ) : periods && periods.length > 0 ? (
          <div className="overflow-auto border rounded">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left font-medium text-gray-700">
                    Mois
                  </th>
                  <th className="border px-3 py-2 text-left font-medium text-gray-700">
                    Gele le
                  </th>
                  <th className="border px-3 py-2 text-left font-medium text-gray-700">
                    Commentaire
                  </th>
                </tr>
              </thead>
              <tbody>
                {periods.map((row, index) => (
                  <tr key={index} className="odd:bg-white even:bg-gray-50">
                    <td className="border px-3 py-2 whitespace-nowrap">
                      {formatMonth(row.period_month)}
                    </td>
                    <td className="border px-3 py-2 whitespace-nowrap">
                      {formatDate(row.frozen_at)}
                    </td>
                    <td className="border px-3 py-2 whitespace-nowrap">
                      {row.comment ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Aucune periode gelee.</div>
        )}
      </section>
    </div >
  )
}
