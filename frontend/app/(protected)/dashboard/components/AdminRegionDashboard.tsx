'use client'

import Link from 'next/link'

export default function AdminRegionDashboard() {
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-semibold">Administration Regionale</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                    href="/admin/shops"
                    className="block p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                    <h2 className="text-lg font-medium mb-2">Gestion des Shops</h2>
                    <p className="text-gray-600 text-sm">Gerer les commerces et leurs configurations.</p>
                </Link>

                <Link
                    href="/admin/billing"
                    className="block p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                    <h2 className="text-lg font-medium mb-2">Facturation</h2>
                    <p className="text-gray-600 text-sm">Gerer le gel des periodes et les exports.</p>
                </Link>
            </div>
        </div>
    )
}
