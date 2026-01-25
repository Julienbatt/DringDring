'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import { useAuth } from '@/app/(protected)/providers/AuthProvider'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { toast } from 'sonner'

export type ClientData = {
    id?: string
    name: string
    address: string
    postal_code: string
    city_id: string
    lat?: number | null
    lng?: number | null
    // city_real_name? : Often redundant if city_id is used for tariff scope, but let's keep it if needed for free text? 
    // Specification implies strict territory. Let's use city_id selection from available cities in region.
    phone?: string | null
    floor?: string | null
    door_code?: string | null
    is_cms: boolean
}

type ClientDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    clientToEdit?: ClientData | null
    onSuccess: () => void
}

export function ClientDialog({ open, onOpenChange, clientToEdit, onSuccess }: ClientDialogProps) {
    const { session, adminContextRegion } = useAuth()
    const [loading, setLoading] = useState(false)
    const [cities, setCities] = useState<{ id: string; name: string }[]>([])

    const [formData, setFormData] = useState<ClientData>({
        name: '',
        address: '',
        postal_code: '',
        city_id: '',
        lat: null,
        lng: null,
        phone: '',
        floor: '',
        door_code: '',
        is_cms: false
    })

    // Load Cities (Region scope)
    useEffect(() => {
        if (open && session?.access_token) {
            const queryParams = adminContextRegion ? `?admin_region_id=${adminContextRegion.id}` : ''
            apiGet<any[]>(`/cities${queryParams}`, session.access_token)
                .then(setCities)
                .catch(e => console.error("Error loading cities", e))
        }
    }, [open, session, adminContextRegion])

    // Populate Form
    const sanitizeAddress = (value: string) => {
        const parts = value
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part && !part.includes(':'))
        return parts.join(', ').trim()
    }

    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                ...clientToEdit,
                address: sanitizeAddress(clientToEdit.address || ''),
                phone: clientToEdit.phone || '',
                floor: clientToEdit.floor || '',
                door_code: clientToEdit.door_code || '',
                // Ensure postal_code is string
                postal_code: clientToEdit.postal_code || '',
                lat: clientToEdit.lat ?? null,
                lng: clientToEdit.lng ?? null,
            })
        } else {
            setFormData({
                name: '',
                address: '',
                postal_code: '',
                city_id: '',
                lat: null,
                lng: null,
                phone: '',
                floor: '',
                door_code: '',
                is_cms: false
            })
        }
    }, [clientToEdit, open])

    const handleAddressSelect = (address: { street: string; number: string; zip: string; city: string; lat?: number; lng?: number }) => {
        const formatted = `${address.street} ${address.number}`.trim()
        const match = cities.find((c) => c.name.toLowerCase() === address.city.toLowerCase())
        setFormData((prev) => ({
            ...prev,
            address: formatted,
            postal_code: address.zip,
            city_id: match ? match.id : prev.city_id,
            lat: address.lat ?? prev.lat ?? null,
            lng: address.lng ?? prev.lng ?? null,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session?.access_token) return

        if (!formData.city_id) {
            toast.error("La commune partenaire est obligatoire")
            return
        }

        setLoading(true)
        try {
            const payload = {
                ...formData,
                // Clean empty strings to null for backend if preferred, or keep as string. 
                phone: formData.phone || null,
                floor: formData.floor || null,
                door_code: formData.door_code || null
            }

            if (clientToEdit?.id) {
                await apiPut(`/clients/${clientToEdit.id}`, payload, session.access_token)
                toast.success("Client mis à jour")
            } else {
                await apiPost('/clients', payload, session.access_token)
                toast.success("Client créé")
            }
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    const isEditing = !!clientToEdit?.id

    const handleDelete = async () => {
        if (!session?.access_token || !clientToEdit?.id) return
        const confirmed = window.confirm("Supprimer ce client ?")
        if (!confirmed) return
        setLoading(true)
        try {
            await apiDelete(`/clients/${clientToEdit.id}`, session.access_token)
            toast.success('Client supprime')
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Erreur lors de la suppression")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Modifier le Client' : 'Nouveau Client'}</DialogTitle>
                    <DialogDescription>
                        Informations de livraison et de contact.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    <div className="space-y-2">
                        <Label htmlFor="name">Nom / Prénom *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Ex: Jean Dupont"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Recherche adresse (Suisse)</Label>
                            <AddressAutocomplete onSelect={handleAddressSelect} />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="address">Adresse (rue, no) *</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        address: e.target.value,
                                        lat: null,
                                        lng: null,
                                    })
                                }
                                required
                                placeholder="Rue de la Gare 12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">Commune partenaire (tarification) *</Label>
                            <Select
                                value={formData.city_id}
                                onValueChange={v => setFormData({ ...formData, city_id: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="npa">NPA *</Label>
                            <Input
                                id="npa"
                                value={formData.postal_code}
                                onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                                required
                                placeholder="Ex: 1950"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                        <div className="space-y-2">
                            <Label htmlFor="floor">Étage</Label>
                            <Input
                                id="floor"
                                value={formData.floor || ''}
                                onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                placeholder="3ème"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Digicode</Label>
                            <Input
                                id="code"
                                value={formData.door_code || ''}
                                onChange={e => setFormData({ ...formData, door_code: e.target.value })}
                                placeholder="1234A"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="079..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="cms"
                            checked={formData.is_cms}
                            onCheckedChange={(c) => setFormData({ ...formData, is_cms: c as boolean })}
                        />
                        <Label htmlFor="cms" className="font-medium">Bénéficiaire CMS (Tarif réduit)</Label>
                    </div>

                    <DialogFooter className="pt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                            {isEditing && (
                                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                                    Supprimer
                                </Button>
                            )}
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Enregistrement...' : (isEditing ? 'Mettre a jour' : 'Creer Client')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
