'use client'

import { useState, useEffect } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { apiGet, apiPost, API_BASE_URL } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/app/(protected)/providers/AuthProvider'

type BillingDocument = {
    id: string
    recipient_type: 'COMMUNE' | 'HQ' | 'SHOP_INDEP'
    recipient_id: string
    recipient_name: string
    period_month: string
    amount_ht: number
    amount_vat: number
    amount_ttc: number
    vat_rate: number
    status: string
    deliveries: number
}

type BillingData = {
    month: string
    rows: BillingDocument[]
}

type BillingLine = {
    id: string
    document_id: string
    recipient_type: 'COMMUNE' | 'HQ' | 'SHOP_INDEP'
    recipient_id: string
    shop_id: string | null
    delivery_id: string | null
    amount_due: number
    delivery_date: string
    client_name: string | null
    commune_name: string | null
    bags: string | null
    shop_name: string | null
}

function getCurrentMonth() {
    const now = new Date()
    now.setMonth(now.getMonth() - 1)
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${now.getFullYear()}-${month}`
}

export default function BillingPage() {
    const { adminContextRegion, user } = useAuth()
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
    const [data, setData] = useState<BillingData | null>(null)
    const [details, setDetails] = useState<BillingLine[]>([])
    const [loading, setLoading] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedRecipientId, setSelectedRecipientId] = useState<string>('all')
    const [activeTab, setActiveTab] = useState<'independent' | 'hq' | 'communes'>('independent')
    const [previewMode, setPreviewMode] = useState(true)
    const [vatRate, setVatRate] = useState<number | null>(null)

    useEffect(() => {
        loadData()
        loadDetails()
        loadVatRate()
    }, [selectedMonth, adminContextRegion])

    const loadData = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const queryParams = adminContextRegion ? `&admin_region_id=${adminContextRegion.id}` : ''
            await apiPost(
                `/billing/region/aggregate?month=${selectedMonth}${queryParams}`,
                {},
                session.access_token
            )
            const res = await apiGet<BillingData>(
                `/billing/documents?month=${selectedMonth}${queryParams}`,
                session.access_token
            )
            setData(res)
        } catch (error) {
            console.error('Failed to load billing data', error)
            toast.error('Erreur lors du chargement des donnees')
        } finally {
            setLoading(false)
        }
    }

    const loadVatRate = async () => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return
            const res = await apiGet<{ rate: number }>(
                `/settings/vat-rate?month=${selectedMonth}`,
                session.access_token
            )
            if (typeof res?.rate === 'number') {
                setVatRate(res.rate)
            }
        } catch (error) {
            const message = String(error || '')
            if (message.includes('access required') || message.includes('API error 403')) {
                setVatRate(null)
                return
            }
            setVatRate(null)
        }
    }

    const loadDetails = async () => {
        setDetailLoading(true)
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const queryParams = adminContextRegion ? `&admin_region_id=${adminContextRegion.id}` : ''
            const res = await apiGet<BillingLine[]>(
                `/billing/documents/lines?month=${selectedMonth}${queryParams}`,
                session.access_token
            )
            setDetails(res)
        } catch (error) {
            console.error('Failed to load billing deliveries', error)
            toast.error('Erreur lors du chargement des details')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const queryParams = adminContextRegion ? `&admin_region_id=${adminContextRegion.id}` : ''
            await apiPost(
                `/billing/region/aggregate?month=${selectedMonth}${queryParams}`,
                {},
                session.access_token
            )
            loadData()
            loadDetails()
            toast.success('Facturation recalculee')
        } catch (error) {
            console.error('Refresh failed', error)
            toast.error('Erreur lors du recalcul')
        } finally {
            setRefreshing(false)
        }
    }

    const handleExport = async (recipientType?: string) => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const apiBase = API_BASE_URL
            const queryParams = adminContextRegion ? `&admin_region_id=${adminContextRegion.id}` : ''
            const typeParam = recipientType ? `&recipient_type=${recipientType}` : ''
            const response = await fetch(`${apiBase}/billing/documents/export?month=${selectedMonth}${queryParams}${typeParam}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `facturation-documents-${selectedMonth}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
        } catch (error) {
            console.error('Export failed', error)
            toast.error("Erreur lors de l'export")
        }
    }

    const downloadZip = async (recipientType: 'COMMUNE' | 'HQ' | 'SHOP_INDEP', filename: string) => {
        try {
            if (!userIsRegional()) {
                toast.error('Selectionnez une entreprise regionale')
                return
            }
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const apiBase = API_BASE_URL
            if (!apiBase) return
            const queryParams = adminContextRegion ? `&admin_region_id=${adminContextRegion.id}` : ''
            const previewParam = previewMode ? '&preview=1' : ''
            const response = await fetch(`${apiBase}/billing/documents/zip?month=${selectedMonth}${queryParams}${previewParam}&recipient_type=${recipientType}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            if (!response.ok) {
                const raw = await response.text()
                let detail = raw
                try {
                    const parsed = JSON.parse(raw)
                    detail = parsed?.detail || raw
                } catch {
                    detail = raw
                }
                if (response.status === 404 && (String(detail).includes('No billing documents found') || String(detail).includes('No deliveries for this period'))) {
                    toast.info('Aucun document pour cette periode')
                    return
                }
                throw new Error(detail || 'ZIP download failed')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('ZIP download failed', error)
            toast.error('Erreur lors du telechargement ZIP')
        }
    }

    const userIsRegional = () => {
        if (user?.role === 'super_admin') {
            return Boolean(adminContextRegion)
        }
        return true
    }

    const handleDownloadPdf = async (documentId: string, recipientName?: string) => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const apiBase = API_BASE_URL
            const url = `${apiBase}/billing/documents/${documentId}/pdf?preview=${previewMode ? 1 : 0}`
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })

            if (!response.ok) throw new Error('PDF download failed')

            const blob = await response.blob()
            const safeName = (recipientName || documentId).replace(/[^a-zA-Z0-9_-]+/g, '_')
            const filename = `facture-${safeName}-${selectedMonth}.pdf`
            const urlObject = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = urlObject
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(urlObject)
        } catch (error) {
            console.error('PDF download failed', error)
            toast.error('Erreur lors du telechargement')
        }
    }

    const documents = data?.rows ?? []
    const independentRows = documents.filter((row) => row.recipient_type === 'SHOP_INDEP')
    const hqRows = documents.filter((row) => row.recipient_type === 'HQ')
    const communeRows = documents.filter((row) => row.recipient_type === 'COMMUNE')
    const activeRecipients =
        activeTab === 'communes' ? communeRows : activeTab === 'hq' ? hqRows : independentRows

    const summaryVolume =
        activeTab === 'communes'
            ? communeRows.reduce((acc, row) => acc + (Number(row.amount_ttc) || 0), 0)
            : activeTab === 'hq'
                ? hqRows.reduce((acc, row) => acc + (Number(row.amount_ttc) || 0), 0)
                : independentRows.reduce((acc, row) => acc + (Number(row.amount_ttc) || 0), 0)

    const summaryDeliveries =
        activeTab === 'communes'
            ? communeRows.reduce((acc, row) => acc + (row.deliveries || 0), 0)
            : activeTab === 'hq'
                ? hqRows.reduce((acc, row) => acc + (row.deliveries || 0), 0)
                : independentRows.reduce((acc, row) => acc + (row.deliveries || 0), 0)

    const summaryCount =
        activeTab === 'communes'
            ? communeRows.length
            : activeTab === 'hq'
                ? hqRows.length
                : independentRows.length

    const vatRateValue = vatRate ?? 0.081
    const totalBilledTtc = documents.reduce((sum, row) => sum + Number(row.amount_ttc || 0), 0)
    const totalBilledHt = documents.reduce((sum, row) => sum + Number(row.amount_ht || 0), 0)
    const totalBilledVat = documents.reduce((sum, row) => sum + Number(row.amount_vat || 0), 0)

    const tableColSpan = 5
    const visibleDetails = details.filter((row) => {
        if (activeTab === 'communes' && row.recipient_type !== 'COMMUNE') return false
        if (activeTab === 'hq' && row.recipient_type !== 'HQ') return false
        if (activeTab === 'independent' && row.recipient_type !== 'SHOP_INDEP') return false
        if (selectedRecipientId === 'all') return true
        return row.recipient_id === selectedRecipientId
    })

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Facturation regionale</h1>
                    <p className="text-muted-foreground">Gestion des clotures mensuelles</p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        className="border rounded px-3 py-2 text-sm"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    <label className="flex items-center gap-2 rounded border px-3 py-2 text-xs text-slate-600">
                        <input
                            type="checkbox"
                            checked={previewMode}
                            onChange={(e) => setPreviewMode(e.target.checked)}
                        />
                        Mode preview (sans gel)
                    </label>
                    <Button
                        variant="outline"
                        onClick={() => handleExport(
                            activeTab === 'communes'
                                ? 'COMMUNE'
                                : activeTab === 'hq'
                                    ? 'HQ'
                                    : 'SHOP_INDEP'
                        )}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => downloadZip('SHOP_INDEP', `factures-commerces-${selectedMonth}.zip`)}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        PDF commerces independants (ZIP)
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => downloadZip('HQ', `factures-hq-${selectedMonth}.zip`)}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        PDF HQ (ZIP)
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => downloadZip('COMMUNE', `factures-communes-${selectedMonth}.zip`)}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        PDF communes & zones (ZIP)
                    </Button>
                    <Button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        variant="default"
                    >
                        {refreshing ? 'Recalcul...' : 'Recalculer la facturation'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Total facture TTC (periode)</div>
                    <div className="text-2xl font-bold">
                        CHF {totalBilledTtc.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        TVA {(vatRateValue * 100).toFixed(1)}%
                    </div>
                    <div className="text-2xl font-bold">
                        CHF {totalBilledVat.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Total HT (periode)</div>
                    <div className="text-2xl font-bold">
                        CHF {totalBilledHt.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        {activeTab === 'communes' ? 'Subvention totale' : 'Montant total'}
                    </div>
                    <div className="text-2xl font-bold">
                        CHF {summaryVolume.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Livraisons</div>
                    <div className="text-2xl font-bold">{summaryDeliveries}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        {activeTab === 'communes'
                            ? 'Communes'
                            : activeTab === 'hq'
                                ? 'HQ'
                                : 'Commerces independants'}
                    </div>
                    <div className="text-2xl font-bold">{summaryCount}</div>
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => {
                            setActiveTab('independent')
                            setSelectedRecipientId('all')
                        }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'independent' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Commerces independants ({independentRows.length})
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('hq')
                            setSelectedRecipientId('all')
                        }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'hq' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        HQ ({hqRows.length})
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('communes')
                            setSelectedRecipientId('all')
                        }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'communes' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Communes & zones ({communeRows.length})
                    </button>
                </div>
                <div className="table-scroll">
                    <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                {activeTab === 'communes'
                                    ? 'Commune partenaire'
                                    : activeTab === 'hq'
                                        ? 'HQ'
                                        : 'Commerce independant'}
                            </TableHead>
                            <TableHead className="text-right">Livraisons</TableHead>
                            <TableHead className="text-right">Montant facture (TTC)</TableHead>
                            <TableHead className="text-center">Statut</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={tableColSpan} className="h-24 text-center">Chargement...</TableCell>
                            </TableRow>
                        ) : activeTab === 'communes' ? (
                            communeRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={tableColSpan} className="h-24 text-center text-muted-foreground">Aucune donnee pour ce mois.</TableCell>
                                </TableRow>
                            ) : (
                                communeRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.recipient_name}</TableCell>
                                        <TableCell className="text-right">{row.deliveries}</TableCell>
                                        <TableCell className="text-right">
                                            CHF {Number(row.amount_ttc).toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">En cours</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDownloadPdf(row.id, row.recipient_name)}
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )
                        ) : activeTab === 'hq' ? (
                            hqRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={tableColSpan} className="h-24 text-center text-muted-foreground">Aucune donnee pour ce mois.</TableCell>
                                </TableRow>
                            ) : (
                                hqRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.recipient_name}</TableCell>
                                        <TableCell className="text-right">{row.deliveries}</TableCell>
                                        <TableCell className="text-right">
                                            CHF {Number(row.amount_ttc).toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">En cours</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDownloadPdf(row.id, row.recipient_name)}
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )
                        ) : independentRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={tableColSpan} className="h-24 text-center text-muted-foreground">Aucune donnee pour ce mois.</TableCell>
                            </TableRow>
                        ) : (
                            independentRows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.recipient_name}</TableCell>
                                    <TableCell className="text-right">{row.deliveries}</TableCell>
                                    <TableCell className="text-right">
                                        CHF {Number(row.amount_ttc).toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline">En cours</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadPdf(row.id, row.recipient_name)}
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    </Table>
                </div>
            </div>

            <div className="rounded-md border bg-white p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="text-lg font-semibold">Detail des courses</div>
                        <div className="text-sm text-muted-foreground">
                            Liste des livraisons pour audit, filtrees par commerce si besoin.
                        </div>
                    </div>
                    <select
                        className="border rounded px-3 py-2 text-sm"
                        value={selectedRecipientId}
                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                    >
                        <option value="all">
                            {activeTab === 'communes'
                                ? 'Toutes les communes'
                                : activeTab === 'hq'
                                    ? 'Tous les HQ'
                                    : 'Tous les commerces'}
                        </option>
                        {activeRecipients.map((row) => (
                            <option key={row.id} value={row.recipient_id}>
                                {row.recipient_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="table-scroll">
                    <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Commerce</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Commune partenaire</TableHead>
                            <TableHead className="text-right">Sacs</TableHead>
                            <TableHead className="text-right">Montant a facturer (CHF)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {detailLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-20 text-center">Chargement...</TableCell>
                            </TableRow>
                        ) : visibleDetails.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                                    Aucune livraison pour cette periode.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleDetails.map((row) => {
                                const amountDue = Number(row.amount_due || 0)
                                return (
                                    <TableRow key={row.delivery_id || row.id}>
                                        <TableCell>{new Date(row.delivery_date).toLocaleDateString('fr-CH')}</TableCell>
                                        <TableCell>{row.shop_name || '-'}</TableCell>
                                        <TableCell>{row.client_name || '-'}</TableCell>
                                        <TableCell>{row.commune_name || '-'}</TableCell>
                                        <TableCell className="text-right">{row.bags ?? '-'}</TableCell>
                                        <TableCell className="text-right">
                                            CHF {amountDue.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
