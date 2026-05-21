// Mock user: default@fireplan.app, DOB 1995-01-15
// Mirrors the snapshots created by populate_mock_data.py
// age and ageElapsed are derived from DOB at each snapshot date

export interface MockSnapshot {
  id: number
  created_date: string
  income: number
  expense: number
  assets: { name: string; value: number; return: number }[]
  sell_at_retirement: boolean
  age: number
  ageElapsed: number  // fraction of birthday-year elapsed (0.0–0.998)
}

export const MOCK_SNAPSHOTS: MockSnapshot[] = [
  {
    id: 1,
    created_date: "2025-11-22",
    income: 62000,
    expense: 43000,
    assets: [
      { name: "cash", value: 20000, return: 0 },
      { name: "investment", value: 35000, return: 0.07 },
    ],
    sell_at_retirement: true,
    age: 30,
    ageElapsed: 0.85,  // Jan 15 → Nov 22 ≈ 311/365
  },
  {
    id: 2,
    created_date: "2026-02-20",
    income: 65000,
    expense: 41500,
    assets: [
      { name: "cash", value: 24000, return: 0 },
      { name: "investment", value: 42000, return: 0.07 },
    ],
    sell_at_retirement: true,
    age: 31,
    ageElapsed: 0.10,  // Jan 15 → Feb 20 ≈ 36/365
  },
  {
    id: 3,
    created_date: "2026-05-21",
    income: 70000,
    expense: 40000,
    assets: [
      { name: "cash", value: 30000, return: 0 },
      { name: "investment", value: 50000, return: 0.07 },
    ],
    sell_at_retirement: true,
    age: 31,
    ageElapsed: 0.35,  // Jan 15 → May 21 ≈ 126/365
  },
]
