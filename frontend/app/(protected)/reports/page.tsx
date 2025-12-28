'use client'

import { Suspense } from 'react'
import CityReport from './components/CityReport'
import HqReport from './components/HqReport'
import ShopReport from './components/ShopReport'
import { useMe } from '../hooks/useMe'

function ReportsContent() {
  const { data, loading, error } = useMe()

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

  if (data.role === 'city') {
    return <CityReport />
  }

  if (data.role === 'hq') {
    return <HqReport />
  }

  if (data.role === 'shop') {
    return <ShopReport />
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
