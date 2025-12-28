'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api' // Notre client API

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiData, setApiData] = useState<any>(null) // Pour afficher le resultat backend
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setApiData(null)
    
    // 1. Authentification Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Erreur Login: " + error.message)
      setLoading(false)
      return
    }

    // 2. Si succes, on recupere le JWT
    const token = data.session?.access_token
    if (!token) {
        alert("Pas de token recu !")
        setLoading(false)
        return
    }

    // 3. Appel au Backend FastAPI avec le token
    try {
        const identity = await apiGet('/me', token)
        setApiData(identity) // Succes !
    } catch (err: any) {
        alert("Erreur Backend: " + err.message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">DringDring Login</h2>
          <p className="mt-2 text-sm text-gray-500">Test de connexion complet</p>
        </div>

        {/* Formulaire Login */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <input
              type="email" required placeholder="Email (ex: admin@sion.ch)"
              className="w-full rounded-md border p-3"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password" required placeholder="Password"
              className="w-full rounded-md border p-3"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        {/* Zone de resultat API */}
        {apiData && (
          <div className="mt-6 rounded-md bg-green-50 p-4 border border-green-200">
            <h3 className="font-bold text-green-800">Succes backend !</h3>
            <pre className="mt-2 overflow-auto text-xs text-green-900 bg-white p-2 rounded border">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
