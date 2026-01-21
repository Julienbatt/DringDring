'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Snowflake, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiGet, apiPost } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import JSConfetti from 'js-confetti'

type BillingRow = {
    shop_id: string
    shop_name: string
    city_name: string
    total_deliveries: number
    total_volume_chf: number
    is_frozen: boolean
    pdf_url?: string
}

type BillingData = {
    month: string
    rows: BillingRow[]
}

function getCurrentMonth() {
    const now = new Date()
    now.setMonth(now.getMonth() - 1) // Default to previous month
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${now.getFullYear()}-${month}`
}

export default function BillingPage() {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
    const [data, setData] = useState<BillingData | null>(null)
    const [loading, setLoading] = useState(false)
    const [freezing, setFreezing] = useState(false)

    useEffect(() => {
        loadData()
    }, [selectedMonth])

    const loadData = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            // Use the HQ billing endpoint which returns filtered shop lists via RLS
            const res = await apiGet<BillingData>(
                `/reports/hq-billing?month=${selectedMonth}`,
                session.access_token
            )
            setData(res)
        } catch (error) {
            console.error('Failed to load billing data', error)
            toast.error("Erreur lors du chargement des données")
        } finally {
            setLoading(false)
        }
    }

    const handleFreeze = async () => {
        if (!confirm(`Voulez-vous vraiment valider et geler la facturation pour ${selectedMonth} ?\nCette action générera les factures PDF pour tous les magasins.`)) {
            return
        }

        setFreezing(true)
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const res = await apiPost<{ results: any[] }>(
                `/billing/region/freeze?month=${selectedMonth}`,
                {},
                session.access_token
            )

            toast.success(`${res.results.filter(r => r.status === 'frozen').length} magasins validés avec succès`)

            const jsConfetti = new JSConfetti()
            jsConfetti.addConfetti()

            loadData()
        } catch (error) {
            console.error('Freeze failed', error)
            toast.error("Erreur lors de la validation")
        } finally {
            setFreezing(false)
        }
    }

    const handleExport = async () => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/reports/hq-billing/export?month=${selectedMonth}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `facturation-region-${selectedMonth}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
        } catch (error) {
            console.error('Export failed', error)
            toast.error("Erreur lors de l'export")
        }
    }

    // Calculate totals
    const totalVolume = data?.rows.reduce((acc, row) => acc + (Number(row.total_volume_chf) || 0), 0) || 0
    const totalDeliveries = data?.rows.reduce((acc, row) => acc + (row.total_deliveries || 0), 0) || 0
    const allFrozen = data?.rows.length ? data.rows.every(r => r.is_frozen) : false

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Facturation Régionale</h1>
                    <p className="text-muted-foreground">Gestion des clôtures mensuelles</p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        className="border rounded px-3 py-2 text-sm"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button
                        onClick={handleFreeze}
                        disabled={loading || freezing || allFrozen || !data?.rows.length}
                        variant={allFrozen ? "secondary" : "default"}
                    >
                        <Snowflake className="mr-2 h-4 w-4" />
                        {freezing ? "Validation..." : allFrozen ? "Période Validée" : "Valider la Période"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Volume Total</div>
                    <div className="text-2xl font-bold">CHF {totalVolume.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Livraisons</div>
                    <div className="text-2xl font-bold">{totalDeliveries}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Magasins</div>
                    <div className="text-2xl font-bold">{data?.rows.length || 0}</div>
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Magasin</TableHead>
                            <TableHead>Ville</TableHead>
                            <TableHead className="text-right">Livraisons</TableHead>
                            <TableHead className="text-right">Total CHF</TableHead>
                            <TableHead className="text-center">Statut</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Chargement...</TableCell>
                            </TableRow>
                        ) : data?.rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucune donnée pour ce mois.</TableCell>
                            </TableRow>
                        ) : (
                            data?.rows.map((row) => (
                                <TableRow key={row.shop_id}>
                                    <TableCell className="font-medium">{row.shop_name}</TableCell>
                                    <TableCell>{row.city_name}</TableCell>
                                    <TableCell className="text-right">{row.total_deliveries}</TableCell>
                                    <TableCell className="text-right">CHF {Number(row.total_volume_chf).toLocaleString('fr-CH', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-center">
                                        {row.is_frozen ?
                                            <Badge variant="default" className="bg-green-600">Validé</Badge> :
                                            <Badge variant="outline">En cours</Badge>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {row.is_frozen && (
                                            <Button variant="ghost" size="sm" asChild>
                                                <a
                                                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/reports/shop-monthly-pdf?shop_id=${row.shop_id}&month=${selectedMonth}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
