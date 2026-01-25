'use client'

import { useAuth } from '../providers/AuthProvider'
import type { UserIdentity } from '../providers/AuthProvider'

export type MeResponse = UserIdentity

export function useMe() {
  const { user, loading, error, refresh } = useAuth()

  return {
    data: user,
    loading,
    error,
    refresh
  }
}
