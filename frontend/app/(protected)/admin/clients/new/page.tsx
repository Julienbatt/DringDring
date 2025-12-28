'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type City = {
    id: string
    name: string
    postal_code: string
}

export default function NewClientPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [cities, setCities] = useState<City[]>([])

    // Form state
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [postalCode, setPostalCode] = useState('')
    const [cityId, setCityId] = useState('')
    const [isCms, setIsCms] = useState(false)

    useEffect(() => {
        loadCities()
    }, [])

    const loadCities = async () => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session?.access_token) return

            const data = await apiGet<City[]>('/me/cities', session.access_token)
            setCities(data)
        } catch (error) {
            console.error('Failed to load cities', error)
            toast.error("Impossible de charger les villes")
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

            await apiPost('/clients', {
                name,
                address,
                postal_code: postalCode,
                city_id: cityId,
                is_cms: isCms
            }, session.access_token)

            toast.success("Client créé avec succès")
            router.push('/admin/clients')
        } catch (error) {
            console.error('Failed to create client', error)
            toast.error("Erreur lors de la création du client")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/clients">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Nouveau Client</h1>
            </div>

            <div className="rounded-lg border p-6 bg-white shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom / Raison Sociale</Label>
                        <Input
                            id="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Pharmacie du Centre"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="address">Adresse</Label>
                            <Input
                                id="address"
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Rue de la Gare 1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="postalCode">NPA</Label>
                            <Input
                                id="postalCode"
                                required
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                placeholder="1000"
                            />
                        </div>
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

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="isCms"
                            checked={isCms}
                            onCheckedChange={(checked) => setIsCms(checked as boolean)}
                        />
                        <Label htmlFor="isCms">Est un établissement médico-social (CMS)</Label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Création..." : "Créer le client"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
