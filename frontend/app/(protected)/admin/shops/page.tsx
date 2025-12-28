'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type Shop = {
    id: string
    name: string
    city_name: string
    hq_name: string
}

export default function ShopsPage() {
    const [shops, setShops] = useState<Shop[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadShops()
    }, [])

    const loadShops = async () => {
        try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session?.access_token) return

            const data = await apiGet<Shop[]>('/shops/admin', session.access_token)
            setShops(data)
        } catch (error) {
            console.error('Failed to load shops', error)
            toast.error("Erreur lors du chargement des magasins")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Gestion des Magasins</h1>
                <Link href="/admin/shops/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau Magasin
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Ville</TableHead>
                            <TableHead>HQ</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Chargement...</TableCell>
                            </TableRow>
                        ) : shops.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    Aucun magasin trouvé.
                                </TableCell>
                            </TableRow>
                        ) : (
                            shops.map((shop) => (
                                <TableRow key={shop.id}>
                                    <TableCell className="font-medium">{shop.name}</TableCell>
                                    <TableCell>{shop.city_name}</TableCell>
                                    <TableCell>{shop.hq_name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Modifier</Button>
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
