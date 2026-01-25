'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '../hooks/useMe'

function ReportsContent() {
  const router = useRouter()
  const { data, loading, error } = useMe()
  const role = data?.role

  useEffect(() => {
    if (role && ['city', 'hq', 'shop'].includes(role)) {
      router.replace('/dashboard')
    }
  }, [role, router])

  if (loading) {
    return (
      <div className="p-8 text-sm text-gray-600">
        Chargement de votre espace...
      </div>
    )
  }

  if (error) {
    return <div className="p-8 text-sm text-red-600">{error}</div>
  }

  if (!data?.role) {
    return (
      <div className="p-8 text-sm text-gray-600">
        Aucun role attribue.
      </div>
    )
  }

  if (['city', 'hq', 'shop'].includes(data.role)) {
    return <div className="p-8 text-sm text-gray-600">Redirection...</div>
  }

  if (
    data.role === 'admin_region' ||
    data.role === 'super_admin' ||
    data.role === 'courier' ||
    data.role === 'customer'
  ) {
    return (
      <div className="p-8 text-sm text-gray-600">
        Vue de reporting pour ce role: en cours de construction.
      </div>
    )
  }

  return (
    <div className="p-8 text-sm text-gray-600">
      Aucune vue de reporting disponible pour ce role.
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ReportsContent />
    </Suspense>
  )
}
