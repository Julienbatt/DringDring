'use client'

import React from 'react'
import { useCustomerDeliveries } from '../hooks/useCustomerDeliveries'
import { toast } from 'sonner'

function getStatusStep(status: string) {
    if (status === 'delivered') return 3
    if (status === 'picked_up') return 2
    return 1 // created
}

export default function CustomerDashboard() {
    const { data, loading, error, refresh } = useCustomerDeliveries()

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 bg-gray-50 min-h-screen">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Vos Commandes</h1>
                <p className="text-lg text-gray-500">Suivez l'avancement de vos livraisons en temps réel.</p>
            </header>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="animate-pulse bg-white p-6 rounded-2xl h-40"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
                    <p className="font-semibold">{error}</p>
                </div>
            ) : !data || data.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center shadow-sm border border-gray-100">
                    <div className="text-5xl mb-4">🛒</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune commande active</h2>
                    <p className="text-gray-500">Vos futures livraisons apparaîtront ici.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={refresh} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">
                            Actualiser
                        </button>
                    </div>

                    {data.map((delivery) => {
                        const currentStep = getStatusStep(delivery.status)
                        const isDelivered = currentStep === 3

                        return (
                            <div key={delivery.delivery_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transform transition-all hover:shadow-md">
                                <div className="p-6 md:p-8">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1">
                                                Commande du {new Date(delivery.delivery_date).toLocaleDateString('fr-CH')}
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900">{delivery.shop_name}</h2>
                                            <p className="text-gray-500 mt-1">{delivery.bags} sac{delivery.bags > 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-gray-100 text-gray-800 font-bold px-3 py-1 rounded-lg text-sm inline-block">
                                                {delivery.time_window}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="relative">
                                        {/* Bar background */}
                                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>
                                        {/* Bar progress */}
                                        <div
                                            className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                        ></div>

                                        <div className="relative flex justify-between w-full">
                                            {/* Step 1 */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-white z-10 ${currentStep >= 1 ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-300'}`}>
                                                    1
                                                </div>
                                                <span className={`text-xs font-medium md:text-sm ${currentStep >= 1 ? 'text-blue-900' : 'text-gray-400'}`}>Validée</span>
                                            </div>

                                            {/* Step 2 */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-white z-10 ${currentStep >= 2 ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-300'}`}>
                                                    2
                                                </div>
                                                <span className={`text-xs font-medium md:text-sm ${currentStep >= 2 ? 'text-blue-900' : 'text-gray-400'}`}>En route</span>
                                            </div>

                                            {/* Step 3 */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-white z-10 ${currentStep >= 3 ? 'border-green-600 text-white bg-green-600' : 'border-gray-300 text-gray-300'}`}>
                                                    {currentStep >= 3 ? '✓' : '3'}
                                                </div>
                                                <span className={`text-xs font-medium md:text-sm ${currentStep >= 3 ? 'text-green-700' : 'text-gray-400'}`}>Livrée</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                {!isDelivered && (
                                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Un problème ?</span>
                                        <button
                                            onClick={() => toast.info('Support contacté (Simulation)')}
                                            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            Contacter le support
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
