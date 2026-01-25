'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditShopPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/admin/shops')
    }, [router])

    return <div className="p-6 text-sm text-gray-500">Redirection...</div>
}
