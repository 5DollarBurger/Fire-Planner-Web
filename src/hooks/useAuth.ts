"use client"

import { useState, useCallback } from "react"
import { api } from "@/lib/api"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    accessToken: null,
    refreshToken: null,
  })

  const loginWithGoogle = useCallback(async (googleToken: string) => {
    const tokens = await api.googleAuth(googleToken)
    setAuth({ accessToken: tokens.access, refreshToken: tokens.refresh })
    return tokens
  }, [])

  const logout = useCallback(() => {
    setAuth({ accessToken: null, refreshToken: null })
  }, [])

  const refresh = useCallback(async () => {
    if (!auth.refreshToken) throw new Error("No refresh token")
    const tokens = await api.refreshToken(auth.refreshToken)
    setAuth((prev) => ({ ...prev, accessToken: tokens.access }))
    return tokens.access
  }, [auth.refreshToken])

  return {
    accessToken: auth.accessToken,
    isAuthenticated: !!auth.accessToken,
    loginWithGoogle,
    logout,
    refresh,
  }
}
