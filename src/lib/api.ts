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

export const api = {
  googleAuth: (googleToken: string) =>
    request<{ access: string; refresh: string }>("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ token: googleToken }),
    }),

  refreshToken: (refresh: string) =>
    request<{ access: string }>("/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),

  projectLiquidAsset: (payload: object, token?: string) =>
    request<{ liquidAsset: number[]; age: number[] }>("/project/", {
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
