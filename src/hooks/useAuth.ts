"use client"

import { useState, useCallback, useEffect } from "react"
import { api } from "@/lib/api"

const STORAGE_KEY = "fire_auth"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
}

function readStorage(): AuthState {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { accessToken: null, refreshToken: null }
    return JSON.parse(raw) as AuthState
  } catch {
    return { accessToken: null, refreshToken: null }
  }
}

function writeStorage(state: AuthState) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearStorage() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ accessToken: null, refreshToken: null })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = readStorage()
    setAuth(stored)
    setHydrated(true)
  }, [])

  const loginWithGoogle = useCallback(async (googleToken: string) => {
    const tokens = await api.googleAuth(googleToken)
    const next = { accessToken: tokens.access, refreshToken: tokens.refresh }
    setAuth(next)
    writeStorage(next)
    return tokens
  }, [])

  const logout = useCallback(() => {
    setAuth({ accessToken: null, refreshToken: null })
    clearStorage()
  }, [])

  const refresh = useCallback(async () => {
    if (!auth.refreshToken) throw new Error("No refresh token")
    const tokens = await api.refreshToken(auth.refreshToken)
    setAuth((prev) => {
      const next = { ...prev, accessToken: tokens.access }
      writeStorage(next)
      return next
    })
    return tokens.access
  }, [auth.refreshToken])

  const isReturningUser = hydrated && !!readStorage().refreshToken

  return {
    accessToken: auth.accessToken,
    isAuthenticated: hydrated && !!auth.accessToken,
    isReturningUser,
    loginWithGoogle,
    logout,
    refresh,
  }
}
