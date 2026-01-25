"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Download, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

import { createClient } from "@/lib/supabase/client"
import { Session } from "@supabase/supabase-js"
import { API_BASE_URL } from "@/lib/api"
import { useAuth } from "@/app/(protected)/providers/AuthProvider"

interface BillingRow {
  shop_id: string
  shop_name: string
  hq_id?: string | null
  hq_name?: string | null
  city_name: string
  total_deliveries: number
  total_bags: number
  total_amount: number | string
  is_frozen: boolean
  frozen_at: string | null
  frozen_by: { id: string; email: string } | null
  pdf_url: string | null
  pdf_sha256: string | null
}

interface BillingResponse {
  month: string
  rows: BillingRow[]
}

interface BillingDelivery {
  delivery_id: string
  delivery_date: string
  shop_id: string
  shop_name: string
  hq_id?: string | null
  city_name: string
  client_name: string | null
  address: string | null
  postal_code: string | null
  delivery_city: string | null
  bags: number | null
  time_window: string | null
  total_price: number | string | null
  share_admin_region: number | string | null
  share_city: number | string | null
  share_client: number | string | null
}

function HqBillingContent() {
  const [session, setSession] = useState<Session | null>(null)
  const supabase = createClient()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<BillingResponse | null>(null)
  const [details, setDetails] = useState<BillingDelivery[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedShopId, setSelectedShopId] = useState<string>('all')

  const currentMonth = format(new Date(), "yyyy-MM")
  const selectedMonth = searchParams.get("month") || currentMonth

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    fetchBillingData(selectedMonth)
    fetchBillingDetails(selectedMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, session])

  const fetchBillingData = async (month: string) => {
    const token = session?.access_token
    const apiUrl = API_BASE_URL
    if (!token || !apiUrl) return

    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/reports/hq-billing?month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error("Erreur lors du chargement des donnees")
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      toast.error("Erreur", {
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBillingDetails = async (month: string) => {
    const token = session?.access_token
    const apiUrl = API_BASE_URL
    if (!token || !apiUrl) return

    setDetailLoading(true)
    try {
      const res = await fetch(`${apiUrl}/reports/hq-billing-deliveries?month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error("Erreur lors du chargement des details")
      const json = await res.json()
      setDetails(json)
    } catch (err: any) {
      toast.error("Erreur", {
        description: err.message,
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(`/hq/billing?month=${e.target.value}`)
  }

  const handleDownloadPdf = async (shop: BillingRow) => {
    if (!session?.access_token) return
    const apiUrl = API_BASE_URL
    if (!apiUrl) return

    try {
      const res = await fetch(
        `${apiUrl}/reports/shop-monthly-pdf?shop_id=${shop.shop_id}&month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      if (!res.ok) throw new Error("Impossible de telecharger le PDF")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Facture_${shop.shop_name.replace(/\s+/g, "_")}_${selectedMonth}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      toast.error("Erreur telechargement", {
        description: err.message,
      })
    }
  }

  const downloadZip = async () => {
    if (!session?.access_token) return
    const apiUrl = API_BASE_URL
    if (!apiUrl) return

    try {
      toast.info("Fonctionnalite temporairement indisponible.")
      return
      /*
      const res = await fetch(
        `${apiUrl}/reports/hq-billing/zip?month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      if (!res.ok) {
        throw new Error("Impossible de creer l archive ZIP (verifiez que des documents sont disponibles)")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `DringDring_Export_HQ_${selectedMonth}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      */
    } catch (err: any) {
      toast.error("Erreur export ZIP", {
        description: err.message,
      })
    }
  }

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(
      Number(val)
    )
  }

  const filteredRows = user?.hq_id
    ? (data?.rows ?? []).filter((row) => row.hq_id === user.hq_id)
    : data?.rows ?? []

  const filteredDetails = user?.hq_id
    ? details.filter((row) => row.hq_id === user.hq_id)
    : details

  const visibleDetails = selectedShopId === 'all'
    ? filteredDetails
    : filteredDetails.filter((row) => row.shop_id === selectedShopId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation officielle</h1>
          <p className="text-muted-foreground">
            Historique des factures et preuves transactionnelles pour vos commerces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="month-select" className="whitespace-nowrap">Periode :</Label>
          <Input
            id="month-select"
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-[180px]"
          />
          <Button variant="outline" onClick={downloadZip}>
            <Download className="mr-2 h-4 w-4" />
            Tout (ZIP)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Etat de la facturation ({format(new Date(selectedMonth), "MMMM yyyy", { locale: fr })})</CardTitle>
          <CardDescription>
            Suivi des documents disponibles pour chaque commerce.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commerce</TableHead>
                  <TableHead>Commune partenaire</TableHead>
                  <TableHead className="text-right">Livraisons</TableHead>
                  <TableHead className="text-right">Sacs</TableHead>
                  <TableHead className="text-right">Montant (CHF)</TableHead>
                  <TableHead className="text-center">Document</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      Aucune donnee pour cette periode.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.shop_id}>
                      <TableCell className="font-medium">{row.shop_name}</TableCell>
                      <TableCell>{row.city_name}</TableCell>
                      <TableCell className="text-right">{row.total_deliveries}</TableCell>
                      <TableCell className="text-right">{row.total_bags}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.is_frozen ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            PDF disponible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            En preparation
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {row.is_frozen ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPdf(row)}
                              title="Telecharger la preuve PDF"
                            >
                              <FileText className="h-4 w-4 mr-2" /> PDF
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" disabled>
                              En attente
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail des courses</CardTitle>
          <CardDescription>
            Toutes les livraisons de la periode, avec filtrage par commerce.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {visibleDetails.length} livraisons affichees
            </div>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
            >
              <option value="all">Tous les commerces</option>
              {filteredRows.map((row) => (
                <option key={row.shop_id} value={row.shop_id}>
                  {row.shop_name}
                </option>
              ))}
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Commerce</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>NPA</TableHead>
                <TableHead>Commune</TableHead>
                <TableHead className="text-right">Sacs</TableHead>
                <TableHead className="text-right">Montant HQ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : visibleDetails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    Aucune livraison pour cette periode.
                  </TableCell>
                </TableRow>
              ) : (
                visibleDetails.map((row) => (
                  <TableRow key={row.delivery_id}>
                    <TableCell>{new Date(row.delivery_date).toLocaleDateString('fr-CH')}</TableCell>
                    <TableCell>{row.shop_name}</TableCell>
                    <TableCell>{row.client_name || '-'}</TableCell>
                    <TableCell>{row.address || '-'}</TableCell>
                    <TableCell>{row.postal_code || '-'}</TableCell>
                    <TableCell>{row.delivery_city || row.city_name}</TableCell>
                    <TableCell className="text-right">{row.bags ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.share_admin_region || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function HqBillingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <HqBillingContent />
    </Suspense>
  )
}
