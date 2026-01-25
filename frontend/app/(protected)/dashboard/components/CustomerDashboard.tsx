'use client'

import React from 'react'
import { useCustomerDeliveries } from '../hooks/useCustomerDeliveries'
import { toast } from 'sonner'
import BrandLogo from '@/components/BrandLogo'

function getStatusStep(status: string) {
    if (status === 'delivered') return 3
    if (status === 'picked_up') return 2
    return 1 // created
}

export default function CustomerDashboard() {
    const { data, loading, error, refresh } = useCustomerDeliveries()
    const activeDeliveries = data?.filter((delivery) => delivery.status !== 'delivered') ?? []
    const recentHistory = data?.filter((delivery) => delivery.status === 'delivered').slice(0, 3) ?? []

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-6 md:px-8">
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-6 p-6 md:p-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                                    <BrandLogo width={180} height={54} className="h-10 w-auto md:h-12" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.28em] text-emerald-600">DringDring</p>
                                    <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Vos commandes</h1>
                                </div>
                            </div>
                            <p className="max-w-xl text-sm text-slate-600 md:text-base">
                                Suivez l'avancement de vos livraisons en temps reel, en toute transparence.
                            </p>
                        </div>
                        <div className="flex w-fit items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            Statut des livraisons en direct
                        </div>
                    </div>
                </section>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-white"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        <p className="font-semibold">{error}</p>
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                        <h2 className="mb-2 text-xl font-semibold text-slate-900">Aucune commande active</h2>
                        <p className="text-slate-500">Vos futures livraisons apparaitront ici.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                onClick={refresh}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                            >
                                Actualiser
                            </button>
                        </div>

                        {activeDeliveries.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                                <p className="text-sm font-medium text-slate-600">Aucune livraison en cours.</p>
                                <p className="mt-1 text-xs text-slate-400">Consultez l'historique pour vos livraisons passees.</p>
                            </div>
                        ) : null}

                        {activeDeliveries.map((delivery) => {
                            const currentStep = getStatusStep(delivery.status)
                            const isDelivered = currentStep === 3

                            return (
                                <div key={delivery.delivery_id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                                    <div className="p-6 md:p-8">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                                    Commande du {new Date(delivery.delivery_date).toLocaleDateString('fr-CH')}
                                                </div>
                                                <h2 className="text-2xl font-semibold text-slate-900">{delivery.shop_name}</h2>
                                                <p className="mt-1 text-sm text-slate-500">{delivery.bags} sac{delivery.bags > 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                                                {delivery.time_window}
                                            </div>
                                        </div>

                                        <div className="relative mt-8">
                                            <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 rounded-full bg-slate-200"></div>
                                            <div
                                                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                                                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                            ></div>

                                            <div className="relative flex w-full justify-between">
                                                {[
                                                    { label: 'Validee', step: 1 },
                                                    { label: 'En route', step: 2 },
                                                    { label: 'Livree', step: 3 },
                                                ].map((item) => (
                                                    <div key={item.step} className="flex flex-col items-center gap-2">
                                                        <div
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-500 ${
                                                                currentStep >= item.step
                                                                    ? item.step === 3
                                                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                        : 'border-emerald-500 text-emerald-600'
                                                                    : 'border-slate-300 text-slate-300'
                                                            }`}
                                                        >
                                                            {item.step}
                                                        </div>
                                                        <span
                                                            className={`text-xs font-medium md:text-sm ${
                                                                currentStep >= item.step ? 'text-slate-700' : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {!isDelivered && (
                                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                                            <span className="text-xs text-slate-500">Un probleme ?</span>
                                            <button
                                                onClick={() => toast.info('Support contacte (simulation).')}
                                                className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
                                            >
                                                Contacter le support
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {recentHistory.length > 0 && (
                            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-slate-900">Historique recent</h3>
                                    <a href="/customer/deliveries" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                                        Voir tout
                                    </a>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {recentHistory.map((delivery) => (
                                        <div key={delivery.delivery_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                                            <div>
                                                <div className="font-semibold text-slate-900">{delivery.shop_name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(delivery.delivery_date).toLocaleDateString('fr-CH')} - {delivery.bags} sac{delivery.bags > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                                Livree
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
