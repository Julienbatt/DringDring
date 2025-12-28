'use client'

import { useState } from 'react'
import { useCourierDeliveries } from '../hooks/useCourierDeliveries'
import { useCourierActions } from '../hooks/useCourierActions'
import { toast } from 'sonner'

function getToday() {
    const now = new Date()
    return now.toISOString().slice(0, 10)
}

function formatTime(isoString: string | null) {
    if (!isoString) return ''
    return new Date(isoString).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })
}

export default function CourierDashboard() {
    const [selectedDate, setSelectedDate] = useState(getToday())
    const { data, loading, error, refresh } = useCourierDeliveries(selectedDate)
    const { updateStatus, updating } = useCourierActions()

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value)
    }

    const handleAction = async (deliveryId: string, nextStatus: 'picked_up' | 'delivered') => {
        const success = await updateStatus(deliveryId, nextStatus)
        if (success) {
            toast.success(nextStatus === 'picked_up' ? 'Colis récupéré !' : 'Colis livré avec succès !')
            refresh()
        } else {
            toast.error("Erreur lors de la mise à jour du statut")
        }
    }

    const getMapLink = (address: string, postal: string, city: string) => {
        const query = encodeURIComponent(`${address}, ${postal} ${city}`)
        return `https://www.google.com/maps/dir/?api=1&destination=${query}`
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-gray-50 z-10 py-2 border-b">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Espace Coursier</h1>
                    <p className="text-sm text-gray-500">Feuille de route du {new Date(selectedDate).toLocaleDateString('fr-CH')}</p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg shadow-sm">
                    {error}
                </div>
            ) : !data || data.length === 0 ? (
                <div className="bg-white border border-gray-200 text-gray-600 p-12 rounded-xl text-center shadow-sm flex flex-col items-center gap-4">
                    <div className="text-4xl">😴</div>
                    <p>Aucune livraison prévue pour cette date.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {data.length} Missions
                        </h2>
                        <button
                            onClick={refresh}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Actualiser
                        </button>
                    </div>

                    <div className="grid gap-6">
                        {data.map((delivery) => {
                            const isPickedUp = delivery.status === 'picked_up'
                            const isDelivered = delivery.status === 'delivered'
                            const isPending = delivery.status === 'created'
                            const isUpdating = updating === delivery.delivery_id

                            return (
                                <div
                                    key={delivery.delivery_id}
                                    className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isDelivered ? 'opacity-60 grayscale-[50%]' : 'hover:shadow-md border-gray-200'}`}
                                >
                                    {/* Header Card */}
                                    <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {delivery.time_window}
                                        </span>
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDelivered ? 'bg-green-100 text-green-700' :
                                            isPickedUp ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-200 text-gray-700'
                                            }`}>
                                            {isDelivered ? 'LIVRÉ' : isPickedUp ? 'EN ROUTE' : 'À RÉCUPÉRER'}
                                        </div>
                                    </div>

                                    <div className="p-5 flex flex-col gap-6">
                                        {/* Pickup Section */}
                                        <div className={`relative pl-6 border-l-2 ${isPending ? 'border-blue-500' : 'border-gray-300'}`}>
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${isPending ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}></div>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Retrait</h3>
                                                    <p className="font-bold text-gray-900 text-lg">{delivery.shop_name}</p>
                                                    <p className="text-sm text-gray-600">{delivery.shop_address}</p>
                                                </div>
                                                <a
                                                    href={getMapLink(delivery.shop_address, '', '')}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Ouvrir dans Maps"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                    </svg>
                                                </a>
                                            </div>
                                            <div className="mt-2 inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-700">
                                                🛍️ {delivery.bags} Sacs
                                            </div>

                                            {isPending && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => handleAction(delivery.delivery_id, 'picked_up')}
                                                        disabled={isUpdating}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isUpdating ? 'Traitement...' : '📍 Confirmer Prise en charge'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Dropoff Section */}
                                        <div className={`relative pl-6 border-l-2 ${isPickedUp ? 'border-green-500' : 'border-gray-200'}`}>
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${isPickedUp ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}></div>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Livraison</h3>
                                                    <p className="font-bold text-gray-900 text-lg">{delivery.client_name || 'Client'}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {delivery.client_address}<br />
                                                        {delivery.client_postal_code} {delivery.client_city}
                                                    </p>
                                                </div>
                                                <a
                                                    href={getMapLink(delivery.client_address, delivery.client_postal_code, delivery.client_city)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                    title="Ouvrir dans Maps"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                    </svg>
                                                </a>
                                            </div>

                                            {isPickedUp && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => handleAction(delivery.delivery_id, 'delivered')}
                                                        disabled={isUpdating}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isUpdating ? 'Traitement...' : '✅ Confirmer Livraison'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
