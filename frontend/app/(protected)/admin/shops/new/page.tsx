'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type City = { id: string; name: string; postal_code: string }
type HQ = { id: string; name: string }
type Tariff = { id: string; name: string; rule: string }

export default function NewShopPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [cities, setCities] = useState<City[]>([])
    const [hqs, setHqs] = useState<HQ[]>([])
    const [tariffs, setTariffs] = useState<Tariff[]>([])

    // Form
    const [name, setName] = useState('')
    const [cityId, setCityId] = useState('')
    const [hqId, setHqId] = useState('')
    const [tariffId, setTariffId] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const [citiesData, hqsData, tariffsData] = await Promise.all([
                apiGet<City[]>('/me/cities', session.access_token),
                apiGet<HQ[]>('/shops/hqs', session.access_token),
                apiGet<Tariff[]>('/shops/tariffs', session.access_token)
            ])

            setCities(citiesData)
            setHqs(hqsData)
            setTariffs(tariffsData)
        } catch (error) {
            console.error('Failed to load form data', error)
            toast.error("Erreur lors du chargement des données")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session?.access_token) {
                toast.error("Session expirée")
                return
            }

            await apiPost('/shops', {
                name,
                city_id: cityId,
                hq_id: hqId,
                tariff_version_id: tariffId
            }, session.access_token)

            toast.success("Magasin créé avec succès")
            router.push('/admin/shops')
        } catch (error) {
            console.error('Failed to create shop', error)
            toast.error("Erreur lors de la création du magasin")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/shops">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Nouveau Magasin</h1>
            </div>

            <div className="rounded-lg border p-6 bg-white shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom du Magasin</Label>
                        <Input
                            id="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Coop City"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Select onValueChange={setCityId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une ville..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.name} ({city.postal_code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hq">Enseigne (HQ)</Label>
                        <Select onValueChange={setHqId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une enseigne..." />
                            </SelectTrigger>
                            <SelectContent>
                                {hqs.map((hq) => (
                                    <SelectItem key={hq.id} value={hq.id}>
                                        {hq.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tariff">Tarif Applicable</Label>
                        <Select onValueChange={setTariffId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un tarif..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tariffs.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Création..." : "Créer le magasin"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
