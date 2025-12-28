'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMe } from '../hooks/useMe'
import { toast } from 'sonner'

export default function SettingsPage() {
    const { data: user, loading } = useMe()
    const [newPassword, setNewPassword] = useState('')
    const [updating, setUpdating] = useState(false)

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPassword) return

        setUpdating(true)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error

            toast.success('Mot de passe mis à jour avec succès')
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

    if (loading) {
        return <div className="p-8">Chargement du profil...</div>
    }

    if (!user) {
        return <div className="p-8">Utilisateur non trouvé</div>
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Paramètres du compte</h1>
                <p className="text-gray-500">Gérez vos informations personnelles et votre sécurité.</p>
            </header>

            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Profil</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Email</label>
                        <div className="text-gray-900 font-medium">{user.email}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Rôle</label>
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {user.role}
                        </div>
                    </div>
                    {user.shop_id && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500">ID Boutique</label>
                            <div className="text-gray-700 text-sm font-mono bg-gray-50 p-2 rounded">{user.shop_id}</div>
                        </div>
                    )}
                    {user.city_id && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500">ID Ville</label>
                            <div className="text-gray-700 text-sm font-mono bg-gray-50 p-2 rounded">{user.city_id}</div>
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Sécurité</h2>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">Minimum 6 caractères.</p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!newPassword || updating}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                            {updating ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="pt-8 border-t">
                <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Se déconnecter
                </button>
            </section>
        </div>
    )
}
