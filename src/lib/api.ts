const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? ""

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw { status: response.status, detail: error }
  }

  return response.json()
}

// Proxy calls go through Next.js route handlers (keeps API_URL and API_KEY server-side)
async function proxyRequest<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((init.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { status: res.status, detail: error }
  }
  return res.json()
}

export interface ApiSnapshot {
  id: number
  created_at: string
  age: number
  age_elapsed: number
  income: number
  expense: number
  assets: { name: string; value: number; return: number }[]
  sell_at_retirement: boolean
  retirement_age: number
  years_to_retire: number
  months_to_retire: number
  days_to_retire: number
  target_fire: number
  projection: { cash: number[]; investment: number[]; age: number[] }
}

export function computeAgeElapsed(): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000) / 365
}

export const listSnapshots = (token: string) =>
  proxyRequest<ApiSnapshot[]>("/api/snapshots", {}, token)

export const createSnapshot = (payload: object, token: string) =>
  proxyRequest<ApiSnapshot>("/api/snapshots", { method: "POST", body: JSON.stringify(payload) }, token)

export const api = {
  googleAuth: (googleToken: string) =>
    fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: googleToken }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) throw { status: res.status, detail: data }
      return data as { access: string; refresh: string }
    }),

  refreshToken: (refresh: string) =>
    fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) throw { status: res.status, detail: data }
      return data as { access: string }
    }),

  projectLiquidAsset: (payload: object, token?: string) =>
    request<{ liquidAsset: number[]; cash: number[]; investment: number[]; age: number[] }>("/project/", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  calculateRetirementAge: (payload: object, token?: string) =>
    request<{ retirementAge: number; yearsToRetire: number }>("/retirementage/", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  calculateAnnualSavings: (payload: object, token: string) =>
    request<{ annualSavings: number | null }>("/requiredannualsaving/", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  calculateMaxSafeWithdrawal: (payload: object, token: string) =>
    request<{ maxSafeWithdrawal: number }>("/maxsafewithdrawal/", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),
}
