"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Download,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Loader2
} from "lucide-react"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { createClient } from "@/lib/supabase/client"
import { Session } from "@supabase/supabase-js"

// Types based on backend /reports/hq-billing response
interface BillingRow {
  shop_id: string
  shop_name: string
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


function HqBillingContent() {
  const [session, setSession] = useState<Session | null>(null)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<BillingResponse | null>(null)

  // Default to current month or query param
  const currentMonth = format(new Date(), "yyyy-MM")
  const selectedMonth = searchParams.get("month") || currentMonth

  // Freeze Modal State
  const [freezeOpen, setFreezeOpen] = useState(false)
  const [selectedShop, setSelectedShop] = useState<BillingRow | null>(null)
  const [freezeComment, setFreezeComment] = useState("")
  const [freezing, setFreezing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    fetchBillingData(selectedMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, session])

  const fetchBillingData = async (month: string) => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/hq-billing?month=${month}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) throw new Error("Erreur lors du chargement des données")
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(`/hq/billing?month=${e.target.value}`)
  }

  const handleFreezeClick = (row: BillingRow) => {
    setSelectedShop(row)
    setFreezeComment("")
    setFreezeOpen(true)
  }

  const confirmFreeze = async () => {
    if (!selectedShop || !session?.access_token) return
    setFreezing(true)
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/deliveries/shop/freeze`)
      url.searchParams.append("shop_id", selectedShop.shop_id)
      url.searchParams.append("month", selectedMonth)
      if (freezeComment) {
        url.searchParams.append("frozen_comment", freezeComment)
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Erreur lors du gel de la période")
      }

      toast.success("Période gelée", {
        description: `La facturation pour ${selectedShop.shop_name} a été validée.`,
      })
      setFreezeOpen(false)
      fetchBillingData(selectedMonth) // Refresh
    } catch (err: any) {
      toast.error("Erreur", {
        description: err.message,
      })
    } finally {
      setFreezing(false)
    }
  }

  const handleDownloadPdf = async (shop: BillingRow) => {
    if (!session?.access_token) return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/shop-monthly-pdf?shop_id=${shop.shop_id}&month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      if (!res.ok) throw new Error("Impossible de télécharger le PDF")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Facture_${shop.shop_name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      toast.error("Erreur téléchargement", {
        description: err.message,
      })
    }
  }

  const downloadZip = async () => {
    if (!session?.access_token) return
    try {
      toast("Préparation de l'archive...", { description: "Cela peut prendre quelques secondes." })
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/hq-billing/zip?month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      if (!res.ok) throw new Error("Impossible de créer l'archive ZIP (vérifiez que des périodes sont gelées)")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `DringDring_Export_HQ_${selectedMonth}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      toast.error("Erreur Export ZIP", {
        description: err.message,
      })
    }
  }

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(Number(val))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation Officielle</h1>
          <p className="text-muted-foreground">
            Validation des périodes de facturation et archivage des preuves transactionnelles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="month-select" className="whitespace-nowrap">Période :</Label>
          <Input
            id="month-select"
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-[180px]"
          />
          <Button
            variant="outline"
            onClick={() => {
              const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/hq-billing/zip?month=${selectedMonth}`
              const a = document.createElement("a")
              a.href = url
              // Add auth token if needed via fetch, but direct link is simpler for now IF cookie auth or simple token param.
              // Since we need Bearer token, we must use fetch + blob pattern like handleDownloadPdf.
              downloadZip()
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Tout (ZIP)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>État de la Facturation ({format(new Date(selectedMonth), "MMMM yyyy", { locale: fr })})</CardTitle>
          <CardDescription>
            Gérez le statut de facturation pour chaque commerce. Une fois gelée ("Frozen"), une facture ne peut plus être modifiée.
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
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-right">Livraisons</TableHead>
                  <TableHead className="text-right">Sacs</TableHead>
                  <TableHead className="text-right">Montant (CHF)</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      Aucune donnée pour cette période.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.rows.map((row) => (
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
                            <Lock className="mr-1 h-3 w-3" /> Gelé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Unlock className="mr-1 h-3 w-3" /> Ouvert
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
                              title="Télécharger la preuve PDF"
                            >
                              <FileText className="h-4 w-4 mr-2" /> PDF
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleFreezeClick(row)}
                            >
                              Geler
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

      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le gel de la période</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de geler la facturation pour <strong>{selectedShop?.shop_name}</strong> pour le mois de <strong>{selectedMonth}</strong>.
              <br /><br />
              <span className="flex items-center text-yellow-600 font-medium">
                <AlertCircle className="h-4 w-4 mr-2" />
                Cette action est irréversible.
              </span>
              Un document PDF signé numériquement sera généré et archivé.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="comment" className="mb-2 block">Commentaire (Audit)</Label>
            <Textarea
              id="comment"
              placeholder="Raison du gel / Validation..."
              value={freezeComment}
              onChange={(e) => setFreezeComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeOpen(false)} disabled={freezing}>
              Annuler
            </Button>
            <Button onClick={confirmFreeze} disabled={freezing}>
              {freezing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le Gel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
