"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, isApiError } from "@/lib/api"

const STORAGE_KEY = "fire_auth"
const LOGIN_PATH = "/landing_insights"

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
  const router = useRouter()
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

  // Dedupe: if two authenticated calls 401 around the same time (e.g. the
  // dashboard's Promise.all of getProfile + listSnapshots), only fire one
  // actual refresh request — the second caller awaits the same promise.
  const refreshInFlight = useRef<Promise<string> | null>(null)
  const refreshOnce = useCallback(() => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = refresh().finally(() => {
        refreshInFlight.current = null
      })
    }
    return refreshInFlight.current
  }, [refresh])

  // Dedupe: guards against concurrent calls (e.g. getProfile and listSnapshots
  // both failing at once) each firing their own logout/toast/redirect.
  const sessionExpiredFired = useRef(false)
  const sessionExpired = useCallback(() => {
    if (sessionExpiredFired.current) return
    sessionExpiredFired.current = true
    logout()
    toast.error("Your session has expired, please sign in again")
    router.replace(LOGIN_PATH)
  }, [logout, router])

  // Wrap every authenticated api.ts call with this instead of passing
  // accessToken directly. On a 401, retries once after a token refresh; if
  // that also fails, logs out, toasts, and redirects to login.
  const authFetch = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      const token = auth.accessToken
      if (!token) {
        sessionExpired()
        throw { status: 401, detail: { message: "Not authenticated" } }
      }
      try {
        return await fn(token)
      } catch (err) {
        if (!isApiError(err) || err.status !== 401) throw err
        try {
          const newToken = await refreshOnce()
          return await fn(newToken)
        } catch {
          sessionExpired()
          throw err
        }
      }
    },
    [auth.accessToken, refreshOnce, sessionExpired]
  )

  const isReturningUser = hydrated && !!readStorage().refreshToken

  return {
    accessToken: auth.accessToken,
    isAuthenticated: hydrated && !!auth.accessToken,
    isReturningUser,
    loginWithGoogle,
    logout,
    refresh,
    authFetch,
  }
}
