'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMe } from '../hooks/useMe'
import { toast } from 'sonner'
import { roleLabel } from '@/lib/roleLabel'
import { apiGet, apiPost } from '@/lib/api'

export default function SettingsPage() {
    const router = useRouter()
    const { data: user, loading } = useMe()
    const [newPassword, setNewPassword] = useState('')
    const [updating, setUpdating] = useState(false)
    const [vatRatePercent, setVatRatePercent] = useState('8.1')
    const [vatMonth, setVatMonth] = useState(() => new Date().toISOString().slice(0, 7))
    const [vatEffectiveFrom, setVatEffectiveFrom] = useState<string | null>(null)
    const [vatLoading, setVatLoading] = useState(false)
    const [vatSaving, setVatSaving] = useState(false)

    useEffect(() => {
        if (user?.role === 'customer') {
            router.replace('/customer/profile')
        }
    }, [user, router])

    useEffect(() => {
        if (user?.role !== 'super_admin') return
        let isActive = true
        const loadVatRate = async () => {
            setVatLoading(true)
            try {
                const supabase = createClient()
                const { data: { session } } = await supabase.auth.getSession()
                if (!session?.access_token) return
                const data = await apiGet<{ rate: number; effective_from: string }>(
                    `/settings/vat-rate?month=${vatMonth}`,
                    session.access_token
                )
                if (!isActive) return
                const percent = (data.rate * 100).toFixed(1).replace(/\.0$/, '')
                setVatRatePercent(percent)
                setVatEffectiveFrom(data.effective_from)
            } catch (error: any) {
                toast.error(`Erreur TVA: ${error.message}`)
            } finally {
                if (isActive) {
                    setVatLoading(false)
                }
            }
        }
        loadVatRate()
        return () => {
            isActive = false
        }
    }, [user?.role, vatMonth])

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault()
        if (!newPassword) return

        setUpdating(true)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (error) throw error

            toast.success('Mot de passe mis a jour avec succes')
            setNewPassword('')
        } catch (error: any) {
            toast.error(`Erreur: ${error.message}`)
        } finally {
            setUpdating(false)
        }
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const handleVatUpdate = async (e: FormEvent) => {
        e.preventDefault()
        const parsedPercent = Number(vatRatePercent.replace(',', '.'))
        if (!Number.isFinite(parsedPercent) || parsedPercent <= 0 || parsedPercent >= 100) {
            toast.error('Valeur TVA invalide')
            return
        }

        setVatSaving(true)
        const supabase = createClient()

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                toast.error('Session invalide')
                return
            }
            const rate = parsedPercent / 100
            const response = await apiPost<{ rate: number; effective_from: string }>(
                '/settings/vat-rate',
                { rate, effective_from: vatMonth },
                session.access_token
            )
            setVatEffectiveFrom(response.effective_from)
            toast.success('TVA mise a jour')
        } catch (error: any) {
            toast.error(`Erreur TVA: ${error.message}`)
        } finally {
            setVatSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8">Chargement du profil...</div>
    }

    if (!user) {
        return <div className="p-8">Utilisateur non trouve</div>
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-16 pt-6 md:px-8">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Parametres du compte</h1>
                    <p className="text-sm text-slate-600 md:text-base">Gerez vos informations et la securite du compte.</p>
                </header>

                <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-900">Profil</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</label>
                            <div className="mt-1 text-sm font-medium text-slate-900">{user.email}</div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Role</label>
                            <div className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                {roleLabel(user.role)}
                            </div>
                        </div>
                        {user.shop_id && (
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ID Boutique</label>
                                <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
                                    {user.shop_id}
                                </div>
                            </div>
                        )}
                        {user.city_id && (
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ID Commune</label>
                                <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
                                    {user.city_id}
                                </div>
                            </div>
                        )}
                        {user.hq_id && (
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ID HQ</label>
                                <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
                                    {user.hq_id}</div>
                            </div>
                        )}
                        {user.admin_region_id && (
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ID Region</label>
                                <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
                                    {user.admin_region_id}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {user.role === 'super_admin' && (
                    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h2 className="text-base font-semibold text-slate-900">Parametres TVA</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            La TVA est appliquee aux factures PDF. Vous pouvez planifier une nouvelle valeur par mois.
                        </p>
                        <form onSubmit={handleVatUpdate} className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-slate-600">Taux TVA (%)</label>
                                <input
                                    type="text"
                                    value={vatRatePercent}
                                    onChange={(e) => setVatRatePercent(e.target.value)}
                                    placeholder="8.1"
                                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    Actif depuis: {vatEffectiveFrom || vatMonth}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Mois d&apos;effet</label>
                                <input
                                    type="month"
                                    value={vatMonth}
                                    onChange={(e) => setVatMonth(e.target.value)}
                                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    {vatLoading ? 'Chargement...' : 'Selectionnez un mois pour previsualiser le taux.'}
                                </p>
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={vatSaving || vatLoading}
                                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {vatSaving ? 'Mise a jour...' : 'Mettre a jour la TVA'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-900">Securite</h2>
                    <form onSubmit={handlePasswordUpdate} className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="new-password" className="text-sm font-medium text-slate-600">Nouveau mot de passe</label>
                            <input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="******"
                                minLength={6}
                                className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-slate-400">Minimum 6 caracteres.</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!newPassword || updating}
                                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {updating ? 'Mise a jour...' : 'Mettre a jour'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="pt-4">
                    <button
                        onClick={handleLogout}
                        className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                    >
                        Se deconnecter
                    </button>
                </section>
            </div>
        </div>
    )
}
