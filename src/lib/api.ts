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

export interface ApiError {
  status: number
  detail: unknown
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  )
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

export interface FineProjection {
  yearsToRetire: number
  monthsToRetire: number
  daysToRetire: number
  retirementDate: string
  targetFIRE: number
  liquidAssetDict: {
    cash: number[]
    investment: number[]
    cpf?: number[]
    total: number[]
    age: number[]
  }
}

export interface ApiProfile {
  date_of_birth: string | null
  gender: "male" | "female"
  country: string
}

export interface ApiSnapshot {
  id: number
  created_at: string
  income: number
  expense: number
  assets: { name: string; value: number; return: number }[]
  oa: number
  sa: number
  ma: number
  age55Withdrawal: "brs_withdrawal" | "frs_withdrawal" | "ers_pursuit"
  cpfLifePlan: "basic" | "standard" | "escalating"
  cpfLifePayoutAge: number
}

export function computeAgeFromDOB(dob: string): { age: number; ageElapsed: number } {
  const now = new Date()
  const birth = new Date(dob)
  const thisYearBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
  const hasBirthdayPassed = now >= thisYearBirthday
  const age = now.getFullYear() - birth.getFullYear() - (hasBirthdayPassed ? 0 : 1)
  const lastBirthday = hasBirthdayPassed
    ? thisYearBirthday
    : new Date(now.getFullYear() - 1, birth.getMonth(), birth.getDate())
  const nextBirthday = hasBirthdayPassed
    ? new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
    : thisYearBirthday
  const ageElapsed =
    (now.getTime() - lastBirthday.getTime()) /
    (nextBirthday.getTime() - lastBirthday.getTime())
  return { age, ageElapsed }
}

export const getProfile = (token: string) =>
  proxyRequest<ApiProfile>("/api/profile", {}, token)

export const updateProfile = (payload: Partial<ApiProfile>, token: string) =>
  proxyRequest<ApiProfile>("/api/profile", { method: "PUT", body: JSON.stringify(payload) }, token)

export const listSnapshots = (token: string) =>
  proxyRequest<ApiSnapshot[]>("/api/snapshots", {}, token)

export const createSnapshot = (payload: object, token: string) =>
  proxyRequest<ApiSnapshot>("/api/snapshots", { method: "POST", body: JSON.stringify(payload) }, token)

export const projectSnapshot = (id: number, token: string) =>
  proxyRequest<{
    snapshotId: number
    snapshotDate: string
    ageAtSnapshot: number
    retirementAge: number
    yearsToRetire: number
    targetFIRE: number
    fineProjection: FineProjection
  }>(`/api/snapshots/${id}/project`, {}, token)

export type ExpenseProjection = {
  age: number[]
  income: number[]
  cpf: number[]
  cash: number[]
  investment: number[]
  shortfall: number[]
  total: number[]
}

export const compareSnapshot = (
  id: number,
  payload: { income: number; expense: number; assetList: object[]; pension?: object },
  token: string,
) =>
  proxyRequest<{
    snapshot: {
      id: number
      createdAt: string
      ageAtSnapshot: number
      retirementAge: number
      yearsToRetire: number
      targetFIRE: number
      fineProjection: FineProjection
      expenseProjection?: ExpenseProjection
    }
    live: {
      age: number
      retirementAge: number
      yearsToRetire: number
      targetFIRE: number
      fineProjection: FineProjection
      expenseProjection?: ExpenseProjection
    }
    scorecard: {
      retirementAgeDelta: number
      yearsToRetireDelta: number
      targetFIREDelta: number
    }
  }>(`/api/snapshots/${id}/compare`, { method: "POST", body: JSON.stringify(payload) }, token)

export const api = {
  googleAuth: (googleToken: string) =>
    fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: googleToken }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw { status: res.status, detail: data }
      return data as { access: string; refresh: string }
    }),

  refreshToken: (refresh: string) =>
    fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}))
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
