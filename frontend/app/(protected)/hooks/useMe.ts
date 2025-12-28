'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'

export type MeResponse = {
  user_id: string
  email: string | null
  role: string | null
  city_id: string | null
  hq_id: string | null
  admin_region_id: string | null
}

export function useMe() {
  const [data, setData] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session

      if (!session) {
        setError('Session inexistante')
        setData(null)
        return
      }

      const me = await apiGet<MeResponse>('/me', session.access_token)
      setData(me)
    } catch (e: any) {
      setError('Erreur lors du chargement du profil')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
