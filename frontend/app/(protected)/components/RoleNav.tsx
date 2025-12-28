'use client'

import Link from 'next/link'
import { useMe } from '../hooks/useMe'
import { Calculator } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Decomptes', href: '/reports', roles: ['city'] },
  { label: 'Synthese HQ', href: '/reports', roles: ['hq'] },
  { label: 'Clients', href: '/admin/clients', roles: ['admin_region'] },
  { label: 'Magasins', href: '/admin/shops', roles: ['admin_region'] },
  { label: 'Facturation', href: '/admin/billing', roles: ['admin_region'] },
  {
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['shop', 'admin_region', 'super_admin', 'courier', 'customer', 'city', 'hq'],
  },
  {
    label: 'Paramètres',
    href: '/settings',
    roles: ['shop', 'admin_region', 'super_admin', 'courier', 'customer', 'city', 'hq'],
  },
]

export default function RoleNav() {
  const { data, loading } = useMe()

  if (loading) {
    return (
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 text-sm text-gray-500">
          <span>DringDring</span>
          <span>Chargement...</span>
        </div>
      </div>
    )
  }

  const role = data?.role ?? 'guest'
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <div className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 text-sm">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-900">DringDring</span>
          <nav className="flex items-center gap-3 text-gray-600">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="text-gray-500">{role}</div>
      </div>
    </div>
  )
}
