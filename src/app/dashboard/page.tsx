"use client"

import { FieldTooltip } from "@/components/field-tooltip"
import { CpfResultsChart, type CpfChartRow } from "@/components/cpf-results-chart"
import { type ExpenseProjection } from "@/components/expense-coverage-chart"
import { ChartRow, ResultsChart } from "@/components/results-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/hooks/useAuth"
import { ApiProfile, ApiSnapshot, FineProjection, compareSnapshot, computeAgeFromDOB, createSnapshot, getProfile, listSnapshots } from "@/lib/api"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import defaultInputs from "@/data/personas/default/inputs.json"
import defaultRetirement from "@/data/personas/default/retirement-age.json"

type SnapshotResult = {
  retirementAge: number
  yearsToRetire: number
  targetFIRE: number
  fineProjection: FineProjection
  expenseProjection?: ExpenseProjection
}

type Scorecard = {
  retirementAgeDelta: number
  yearsToRetireDelta: number
  targetFIREDelta: number
}

type DashboardTab = "calculator" | "cpf"

function buildDefaultResult(): SnapshotResult {
  const fp = defaultRetirement.fineProjection
  const lad = fp.liquidAssetDict
  return {
    retirementAge: defaultRetirement.retirementAge,
    yearsToRetire: fp.yearsToRetire,
    targetFIRE: fp.targetFIRE,
    fineProjection: {
      yearsToRetire: fp.yearsToRetire,
      monthsToRetire: fp.monthsToRetire,
      daysToRetire: fp.daysToRetire,
      retirementDate: (fp as { retirementDate?: string }).retirementDate ?? "",
      targetFIRE: fp.targetFIRE,
      liquidAssetDict: {
        cash: lad.cash,
        investment: lad.investment,
        total: lad.cash.map((c, i) => c + lad.investment[i]),
        age: lad.age,
      },
    },
  }
}

const DEFAULT_CASH = defaultInputs.assetList.find((a) => a.name === "cash")
const DEFAULT_INV = defaultInputs.assetList.find((a) => a.name === "investment")

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function parseCurrency(str: string) {
  const n = parseInt(str.replace(/[^0-9]/g, ""), 10)
  return isNaN(n) ? 0 : n
}

const STEP = 1000

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col -my-1">
      <button
        type="button"
        aria-label="Increase by $1,000"
        onClick={() => onChange(value + STEP)}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Decrease by $1,000"
        onClick={() => onChange(Math.max(0, value - STEP))}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  )
}

const age55Labels: Record<string, string> = {
  brs_withdrawal: "Basic RS",
  frs_withdrawal: "Full RS",
  ers_pursuit: "Enhanced RS",
}

const planLabels: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  escalating: "Escalating",
}

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, accessToken, logout, authFetch } = useAuth()

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated === false) {
      const timer = setTimeout(() => {
        if (!isAuthenticated) router.replace("/landing_insights")
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, router])

  // ── Profile + snapshot data ────────────────────────────────────────────
  const [profile, setProfile] = useState<ApiProfile | null>(null)
  const [snapshots, setSnapshots] = useState<ApiSnapshot[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    Promise.all([
      authFetch((token) => getProfile(token)).then(setProfile).catch(console.error),
      authFetch((token) => listSnapshots(token)).then(setSnapshots).catch(console.error),
    ]).finally(() => setSnapshotsLoading(false))
  }, [accessToken, authFetch])

  // ── Snapshot selection ─────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selected = snapshots[selectedIndex]
  const latestSnap = snapshots[0]

  // ── Tab ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DashboardTab>("calculator")

  // ── Live calculator state ──────────────────────────────────────────────
  const [liveIncome, setLiveIncome] = useState(0)
  const [liveExpense, setLiveExpense] = useState(0)
  const [liveCash, setLiveCash] = useState(0)
  const [liveInvestment, setLiveInvestment] = useState(0)
  const [liveReturn, setLiveReturn] = useState(7)
  const [liveOa, setLiveOa] = useState(0)
  const [liveSa, setLiveSa] = useState(0)
  const [liveMa, setLiveMa] = useState(0)
  const [liveAge55Withdrawal, setLiveAge55Withdrawal] = useState<"brs_withdrawal" | "frs_withdrawal" | "ers_pursuit">("frs_withdrawal")
  const [liveCpfLifePlan, setLiveCpfLifePlan] = useState<"basic" | "standard" | "escalating">("standard")
  const [liveCpfLifePayoutAge, setLiveCpfLifePayoutAge] = useState(65)
  const [liveResult, setLiveResult] = useState<SnapshotResult | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Selected snapshot result + scorecard ───────────────────────────────
  const [selectedResult, setSelectedResult] = useState<SnapshotResult | null>(null)
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)

  // ── CPF coverage state ─────────────────────────────────────────────────
  const [cpfChartData, setCpfChartData] = useState<CpfChartRow[]>([])
  const [expenseCoverage, setExpenseCoverage] = useState<number | null>(null)
  const [cpfLoading, setCpfLoading] = useState(false)
  const [cpfError, setCpfError] = useState<string | null>(null)

  // Derived: live age from profile DOB
  const liveAge = profile?.date_of_birth ? computeAgeFromDOB(profile.date_of_birth).age : null

  // Set by handleSave so the seed effect doesn't blank liveResult immediately after saving
  // (inputs haven't changed, current liveResult is still valid)
  const skipLiveResultClear = useRef(false)

  // Clear baseline immediately when the user switches snapshots
  const prevSelectedId = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (selected?.id !== prevSelectedId.current) {
      prevSelectedId.current = selected?.id
      setSelectedResult(null)
      setScorecard(null)
    }
  }, [selected?.id])

  // Seed live inputs when snapshots load
  useEffect(() => {
    if (!snapshotsLoading && !latestSnap) {
      setLiveIncome(defaultInputs.income)
      setLiveExpense(defaultInputs.expense)
      setLiveCash(DEFAULT_CASH?.value ?? 30000)
      setLiveInvestment(DEFAULT_INV?.value ?? 50000)
      setLiveReturn(Math.round((DEFAULT_INV?.return ?? 0.07) * 100 * 10) / 10)
      setLiveResult(buildDefaultResult())
      return
    }
    if (!latestSnap) return
    const cash = latestSnap.assets.find((a) => a.name === "cash")
    const inv = latestSnap.assets.find((a) => a.name === "investment")
    setLiveIncome(latestSnap.income)
    setLiveExpense(latestSnap.expense)
    setLiveCash(cash?.value ?? 0)
    setLiveInvestment(inv?.value ?? 0)
    setLiveReturn(Math.round((inv?.return ?? 0.07) * 100 * 10) / 10)
    setLiveOa(latestSnap.oa ?? 0)
    setLiveSa(latestSnap.sa ?? 0)
    setLiveMa(latestSnap.ma ?? 0)
    setLiveAge55Withdrawal(latestSnap.age55Withdrawal ?? "frs_withdrawal")
    setLiveCpfLifePlan(latestSnap.cpfLifePlan ?? "standard")
    setLiveCpfLifePayoutAge(latestSnap.cpfLifePayoutAge ?? 65)
    if (skipLiveResultClear.current) {
      skipLiveResultClear.current = false
    } else {
      setLiveResult(null)
    }
    setSaved(false)
  }, [latestSnap, snapshotsLoading])

  // ── Debounced compare/live fetch ───────────────────────────────────────
  useEffect(() => {
    setSaved(false)
    setLiveLoading(true)

    const liveAssets = [
      { name: "cash", value: liveCash, return: 0 },
      { name: "investment", value: liveInvestment, return: liveReturn / 100 },
    ]
    const livePension = {
      oa: liveOa, sa: liveSa, ma: liveMa,
      cpfLife: { plan: liveCpfLifePlan, payoutAge: liveCpfLifePayoutAge },
      age55Withdrawal: liveAge55Withdrawal,
    }

    const timer = setTimeout(async () => {
      try {
        if (selected && accessToken) {
          const result = await authFetch((token) =>
            compareSnapshot(
              selected.id,
              { income: liveIncome, expense: liveExpense, assetList: liveAssets, pension: livePension },
              token,
            )
          )
          setLiveResult(result.live as SnapshotResult)
          setSelectedResult(result.snapshot as SnapshotResult)
          setScorecard(result.scorecard)
        } else {
          const ageInfo = profile?.date_of_birth ? computeAgeFromDOB(profile.date_of_birth) : null
          if (!ageInfo) return
          const res = await fetch("/api/retirement-age", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              age: ageInfo.age,
              ageElapsed: ageInfo.ageElapsed,
              gender: profile?.gender ?? "female",
              country: profile?.country ?? "SGP",
              income: liveIncome,
              expense: liveExpense,
              assetList: liveAssets,
              pension: livePension,
            }),
          })
          if (res.ok) setLiveResult((await res.json()) as SnapshotResult)
          setSelectedResult(null)
          setScorecard(null)
        }
      } catch (err) {
        console.error("Projection failed:", err)
      } finally {
        setLiveLoading(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [selected?.id, accessToken, authFetch, liveIncome, liveExpense, liveCash, liveInvestment, liveReturn, liveOa, liveSa, liveMa, liveAge55Withdrawal, liveCpfLifePlan, liveCpfLifePayoutAge, profile])

  // ── Debounced CPF coverage fetch ───────────────────────────────────────
  useEffect(() => {
    if (!profile?.date_of_birth) return
    const { age: cpfAge, ageElapsed: cpfAgeElapsed } = computeAgeFromDOB(profile.date_of_birth)
    setCpfLoading(true)
    setCpfError(null)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/pension-coverage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: cpfAge,
            ageElapsed: cpfAgeElapsed,
            income: liveIncome,
            expense: liveExpense,
            pension: {
              oa: liveOa,
              sa: liveSa,
              ma: liveMa,
              cpfLife: { plan: liveCpfLifePlan, payoutAge: liveCpfLifePayoutAge },
              age55Withdrawal: liveAge55Withdrawal,
            },
          }),
        })
        if (!res.ok) throw new Error(`pension-coverage ${res.status}`)
        const result = await res.json() as {
          age: number[]; oa: number[]; ra: number[]; ma: number[]
          withdrawal: number[]; expense: number[]; expenseCoverage: number
        }
        setExpenseCoverage(result.expenseCoverage)
        setCpfChartData(result.age.map((a, i) => ({
          age: a, oa: result.oa[i], ra: result.ra[i], ma: result.ma[i],
          withdrawal: result.withdrawal[i], expense: result.expense[i],
        })))
      } catch (err) {
        setCpfError("Could not reach the API. Is the backend running?")
        console.error(err)
      } finally {
        setCpfLoading(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [profile, liveIncome, liveExpense, liveOa, liveSa, liveMa, liveAge55Withdrawal, liveCpfLifePlan, liveCpfLifePayoutAge])

  // ── Derived chart data ─────────────────────────────────────────────────
  const liveChartData: ChartRow[] = liveResult
    ? liveResult.fineProjection.liquidAssetDict.age.map((a, i) => ({
        age: a,
        cash: liveResult.fineProjection.liquidAssetDict.cash[i],
        investment: liveResult.fineProjection.liquidAssetDict.investment[i],
        cpf: liveResult.fineProjection.liquidAssetDict.cpf?.[i] ?? 0,
      }))
    : []

  const baselineOverlay = selectedResult
    ? selectedResult.fineProjection.liquidAssetDict.age.map((a, i) => ({
        age: a,
        total:
          selectedResult.fineProjection.liquidAssetDict.cash[i] +
          selectedResult.fineProjection.liquidAssetDict.investment[i],
      }))
    : undefined

  const latestCashAsset = latestSnap?.assets.find((a) => a.name === "cash")
  const latestInvAsset = latestSnap?.assets.find((a) => a.name === "investment")

  const isModified = !latestSnap
    ? liveResult !== null
    : liveIncome !== latestSnap.income ||
      liveExpense !== latestSnap.expense ||
      liveCash !== (latestCashAsset?.value ?? 0) ||
      liveInvestment !== (latestInvAsset?.value ?? 0) ||
      Math.abs(liveReturn / 100 - (latestInvAsset?.return ?? 0.07)) > 0.0001 ||
      liveOa !== (latestSnap.oa ?? 0) ||
      liveSa !== (latestSnap.sa ?? 0) ||
      liveMa !== (latestSnap.ma ?? 0) ||
      liveAge55Withdrawal !== (latestSnap.age55Withdrawal ?? "frs_withdrawal") ||
      liveCpfLifePlan !== (latestSnap.cpfLifePlan ?? "standard") ||
      liveCpfLifePayoutAge !== (latestSnap.cpfLifePayoutAge ?? 65)

  const ageDelta = scorecard?.retirementAgeDelta ?? null
  const yearsToRetireDelta = scorecard?.yearsToRetireDelta ?? null

  // ── Save Analysis ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!isModified || !accessToken || !liveResult) return
    try {
      const snap = await authFetch((token) =>
        createSnapshot(
          {
            income: liveIncome,
            expense: liveExpense,
            assets: [
              { name: "cash", value: liveCash, return: 0 },
              { name: "investment", value: liveInvestment, return: liveReturn / 100 },
            ],
            oa: liveOa,
            sa: liveSa,
            ma: liveMa,
            age55Withdrawal: liveAge55Withdrawal,
            cpfLifePlan: liveCpfLifePlan,
            cpfLifePayoutAge: liveCpfLifePayoutAge,
          },
          token,
        )
      )
      // Tell the seed effect not to blank liveResult — the inputs haven't
      // changed, so the current projection is still valid.
      skipLiveResultClear.current = true
      setSnapshots((prev) => {
        const idx = prev.findIndex((s) => s.id === snap.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = snap
          return next
        }
        return [snap, ...prev]
      })
      setSelectedIndex(0)
      setSaved(true)
    } catch (err) {
      console.error("Save failed:", err)
    }
  }, [isModified, accessToken, authFetch, liveResult, liveIncome, liveExpense, liveCash, liveInvestment, liveReturn, liveOa, liveSa, liveMa, liveAge55Withdrawal, liveCpfLifePlan, liveCpfLifePayoutAge])

  const handleSignOut = () => {
    logout()
    router.replace("/landing_insights")
  }

  const inputClass =
    "flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"

  // ── Empty / loading states ─────────────────────────────────────────────
  if (snapshotsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading your snapshots…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 border-b border-border text-xs text-muted-foreground">
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span>Free Financial Planning Tools</span>
          </div>
          <div className="py-6 text-center">
            <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">
              Fire Planner
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2">
              Your Journal of Financial Independence
            </p>
          </div>
          <nav className="flex items-center justify-center gap-8 py-3 border-t border-border text-sm">
            <a href="/landing_insights" className="text-muted-foreground hover:text-foreground transition-colors">
              Calculator
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Methodology</a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Research</a>
            <span className="text-border">|</span>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page title */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Account Dashboard
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
              Your Progress
            </h2>
          </div>

          {/* ── Snapshot History ─────────────────────────────────────── */}
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-4">
              <h3 className="font-serif text-base text-foreground whitespace-nowrap">
                Snapshot History
              </h3>
              <div className="flex-1 h-px bg-border" />
            </div>
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No snapshots yet. Use the calculator below and click Save Analysis.
              </p>
            ) : null}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {snapshots.map((snap, i) => {
                const netWorth = snap.assets.reduce((sum, a) => sum + a.value, 0)
                const isSelected = i === selectedIndex
                const snapCash = snap.assets.find((a) => a.name === "cash")
                const snapInv = snap.assets.find((a) => a.name === "investment")

                return (
                  <button key={snap.id} onClick={() => setSelectedIndex(i)} className="text-left w-full group">
                    <Card
                      className={`border transition-colors ${
                        isSelected
                          ? "border-foreground bg-card"
                          : "border-border bg-secondary/30 hover:border-muted-foreground"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {formatDate(snap.created_at)}
                          </p>
                          {isSelected && <span className="text-xs text-foreground">●</span>}
                        </div>
                        <p className="font-serif text-xl text-foreground mb-0.5">
                          {formatCurrency(netWorth)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">Net worth</p>
                        <div className="overflow-hidden max-h-0 group-hover:max-h-48 transition-all duration-200 ease-in-out">
                          <div className="h-px bg-border mt-3 mb-3" />
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Income</p>
                              <p className="text-xs font-serif text-foreground">{formatCurrency(snap.income)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Expenses</p>
                              <p className="text-xs font-serif text-foreground">{formatCurrency(snap.expense)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Cash</p>
                              <p className="text-xs font-serif text-foreground">{formatCurrency(snapCash?.value ?? 0)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Investment</p>
                              <p className="text-xs font-serif text-foreground">{formatCurrency(snapInv?.value ?? 0)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Return</p>
                              <p className="text-xs font-serif text-foreground">
                                {Math.round((snapInv?.return ?? 0) * 100 * 10) / 10}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Scorecard — shown when a snapshot is selected ─────── */}
          {isModified && liveResult && selectedResult && (
            <div className="mb-8 border border-border bg-secondary/30 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">
                Live vs Baseline — {selected && formatDate(selected.created_at)}
              </p>

              {/* Row 1: FIRE metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="font-serif text-2xl text-foreground">
                    {liveResult.retirementAge}{" "}
                    <span className="text-base text-muted-foreground">
                      vs {selectedResult.retirementAge}
                    </span>
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                    Retirement Age
                  </p>
                  {ageDelta !== null && ageDelta !== 0 && (
                    <p className={`text-sm mt-2 ${ageDelta > 0 ? "text-foreground" : "text-destructive"}`}>
                      {ageDelta > 0
                        ? `${ageDelta} year${ageDelta !== 1 ? "s" : ""} earlier`
                        : `${Math.abs(ageDelta)} year${Math.abs(ageDelta) !== 1 ? "s" : ""} later`}
                    </p>
                  )}
                  {ageDelta === 0 && (
                    <p className="text-sm mt-2 text-muted-foreground">No change</p>
                  )}
                </div>

                <div>
                  <p className="font-serif text-2xl text-foreground">
                    {liveResult.fineProjection.yearsToRetire}y{" "}
                    {Math.round(liveResult.fineProjection.monthsToRetire)}m{" "}
                    <span className="text-base text-muted-foreground">
                      vs {selectedResult.fineProjection.yearsToRetire}y{" "}
                      {Math.round(selectedResult.fineProjection.monthsToRetire)}m
                    </span>
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                    Years to Retire
                  </p>
                  {yearsToRetireDelta !== null && yearsToRetireDelta !== 0 && (
                    <p className={`text-sm mt-2 ${yearsToRetireDelta > 0 ? "text-foreground" : "text-destructive"}`}>
                      {yearsToRetireDelta > 0
                        ? `${yearsToRetireDelta.toFixed(1)}y sooner`
                        : `${Math.abs(yearsToRetireDelta).toFixed(1)}y longer`}
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-serif text-2xl text-foreground">
                    {formatCurrencyShort(liveResult.fineProjection.targetFIRE)}{" "}
                    <span className="text-base text-muted-foreground">
                      vs {formatCurrencyShort(selectedResult.fineProjection.targetFIRE)}
                    </span>
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                    Target Capital
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border my-6" />

              {/* Row 2: CPF balances */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(
                  [
                    { label: "OA Balance", live: liveOa, snap: selected?.oa ?? 0 },
                    { label: (liveAge ?? 0) >= 55 ? "RA Balance" : "SA Balance", live: liveSa, snap: selected?.sa ?? 0 },
                    { label: "MA Balance", live: liveMa, snap: selected?.ma ?? 0 },
                  ] as const
                ).map(({ label, live, snap }) => {
                  const delta = live - snap
                  return (
                    <div key={label}>
                      <p className="font-serif text-xl text-foreground">
                        {formatCurrencyShort(live)}{" "}
                        <span className="text-base text-muted-foreground">vs {formatCurrencyShort(snap)}</span>
                      </p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
                      {delta !== 0 && (
                        <p className={`text-sm mt-2 ${delta > 0 ? "text-foreground" : "text-destructive"}`}>
                          {delta > 0 ? "+" : ""}{formatCurrencyShort(delta)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Row 3: CPF strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                <div>
                  <p className="font-serif text-xl text-foreground">
                    {age55Labels[liveAge55Withdrawal]}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Age 55 Strategy</p>
                  {selected && liveAge55Withdrawal !== selected.age55Withdrawal && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      was {age55Labels[selected.age55Withdrawal]}
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-serif text-xl text-foreground">
                    {planLabels[liveCpfLifePlan]}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">CPF Life Plan</p>
                  {selected && liveCpfLifePlan !== selected.cpfLifePlan && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      was {planLabels[selected.cpfLifePlan]}
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-serif text-xl text-foreground">
                    {liveCpfLifePayoutAge}{" "}
                    <span className="text-base text-muted-foreground">
                      vs {selected?.cpfLifePayoutAge ?? 65}
                    </span>
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">CPF Life Payout Age</p>
                  {selected && liveCpfLifePayoutAge !== (selected?.cpfLifePayoutAge ?? 65) && (
                    <p className={`text-sm mt-2 ${liveCpfLifePayoutAge > (selected?.cpfLifePayoutAge ?? 65) ? "text-foreground" : "text-muted-foreground"}`}>
                      {liveCpfLifePayoutAge > (selected?.cpfLifePayoutAge ?? 65) ? "deferred later" : "earlier payout"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Analysis header ──────────────────────────────────────── */}
          <div className="mb-6 flex items-center gap-4">
            <h3 className="font-serif text-lg text-foreground whitespace-nowrap">
              {selected ? `Analysis — ${formatDate(selected.created_at)}` : "Analysis"}
            </h3>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Tab bar ──────────────────────────────────────────────── */}
          <div className="flex border-b border-border mb-8">
            {(
              [
                { id: "calculator" as DashboardTab, label: "FIRE Calculator" },
                { id: "cpf" as DashboardTab, label: "CPF Coverage Today" },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── FIRE Calculator tab ───────────────────────────────────── */}
          {activeTab === "calculator" && (
            <div className="grid gap-12 lg:grid-cols-[380px_1fr] items-start">
              {/* Left: sticky calculator panel */}
              <Card className="lg:sticky lg:top-24 border-border bg-card">
                <CardContent className="p-0">
                  <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
                    <h2 className="font-serif text-xl text-foreground">Your Financial Position</h2>
                    {liveLoading && (
                      <span className="text-xs text-muted-foreground">Calculating…</span>
                    )}
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <FieldTooltip
                        label="Annual Income"
                        tip="Accessible liquid income net of taxes, mortgage, and pension contributions — money available for savings, investing, and day-to-day expenses."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveIncome)}
                          onChange={(e) => setLiveIncome(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveIncome} onChange={setLiveIncome} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldTooltip
                        label="Annual Expenses"
                        tip="Day-to-day quality-of-life expenses excluding taxes, mortgage, pension, and investment contributions. Include short-term debt repayments that are regularly rolled over."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveExpense)}
                          onChange={(e) => setLiveExpense(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveExpense} onChange={setLiveExpense} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldTooltip
                        label="Cash Holdings"
                        tip="Liquid cash or equivalents that yield little return. Counts toward emergency funds and immediate liquidity."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveCash)}
                          onChange={(e) => setLiveCash(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveCash} onChange={setLiveCash} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldTooltip
                        label="Investment Portfolio"
                        tip="Stocks, bonds, and other liquid or semi-liquid assets accessible to fund expenses within a year's notice."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveInvestment)}
                          onChange={(e) => setLiveInvestment(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveInvestment} onChange={setLiveInvestment} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Expected Return
                        </Label>
                        <span className="font-serif text-lg text-foreground">{liveReturn}%</span>
                      </div>
                      <Slider
                        value={liveReturn}
                        onValueChange={(value) => setLiveReturn(value as number)}
                        min={0}
                        max={20}
                        step={0.5}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>20%</span>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <button
                      onClick={handleSave}
                      disabled={!isModified || saved}
                      className="w-full text-sm border border-border px-4 py-2.5 hover:border-foreground transition-colors disabled:opacity-50"
                    >
                      {saved ? "Saved ✓" : "Save Analysis"}
                    </button>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Age is fixed to your date of birth.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Right: ResultsChart */}
              <ResultsChart
                retirementAge={liveResult?.retirementAge ?? null}
                yearsToRetire={liveResult?.fineProjection.yearsToRetire ?? null}
                monthsToRetire={liveResult?.fineProjection.monthsToRetire ?? null}
                daysToRetire={liveResult?.fineProjection.daysToRetire ?? null}
                targetFIRE={liveResult?.fineProjection.targetFIRE ?? null}
                chartData={liveChartData}
                cashOnHand={liveCash}
                investmentPortfolio={liveInvestment}
                annualExpenses={liveExpense}
                loading={liveLoading && liveResult === null}
                error={null}
                expenseProjection={liveResult?.expenseProjection ?? null}
                overlayData={baselineOverlay}
                overlayLabel="Prev. Projection"
                overlayRetirementAge={selectedResult?.retirementAge ?? null}
              />
            </div>
          )}

          {/* ── CPF Coverage Today tab ────────────────────────────────── */}
          {activeTab === "cpf" && (
            <div className="grid gap-12 lg:grid-cols-[380px_1fr] items-start">
              {/* Left: CPF inputs */}
              <Card className="lg:sticky lg:top-24 border-border bg-card">
                <CardContent className="p-0">
                  <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
                    <h2 className="font-serif text-xl text-foreground">Your CPF Balances Today</h2>
                    {cpfLoading && (
                      <span className="text-xs text-muted-foreground">Calculating…</span>
                    )}
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Age (read-only) */}
                    <div className="space-y-1">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Current Age
                      </Label>
                      <p className="font-serif text-lg text-foreground border-b border-border pb-2">
                        {liveAge ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Fixed to date of birth</p>
                    </div>

                    {/* Annual Expenses */}
                    <div className="space-y-2">
                      <FieldTooltip
                        label="Annual Expenses"
                        tip="Projected annual expenses in today's dollars. Used to compute how much of your retirement costs CPF will cover."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveExpense)}
                          onChange={(e) => setLiveExpense(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveExpense} onChange={setLiveExpense} />
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* OA */}
                    <div className="space-y-2">
                      <FieldTooltip
                        label="Ordinary Account (OA)"
                        tip="Current OA balance. Earns 2.5% p.a. Can be withdrawn from age 55 after meeting the Retirement Sum."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveOa)}
                          onChange={(e) => setLiveOa(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveOa} onChange={setLiveOa} />
                      </div>
                    </div>

                    {/* SA / RA */}
                    <div className="space-y-2">
                      <FieldTooltip
                        label={(liveAge ?? 0) >= 55 ? "Retirement Account (RA)" : "Special Account (SA)"}
                        tip={(liveAge ?? 0) >= 55
                          ? "Current RA balance. Earns 4% p.a. Funds your CPF Life premium and provides lifelong monthly payouts."
                          : "Current SA balance. Earns 4% p.a. Transferred to Retirement Account at age 55 to meet the Retirement Sum."}
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveSa)}
                          onChange={(e) => setLiveSa(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveSa} onChange={setLiveSa} />
                      </div>
                    </div>

                    {/* MA */}
                    <div className="space-y-2">
                      <FieldTooltip
                        label="MediSave Account (MA)"
                        tip="Current MA balance. Earns 4% p.a. Capped at the Basic Healthcare Sum. Overflow moves to SA or RA."
                      />
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveMa)}
                          onChange={(e) => setLiveMa(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                        <Stepper value={liveMa} onChange={setLiveMa} />
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* CPF Life Plan */}
                    <div className="space-y-2">
                      <FieldTooltip
                        label="CPF Life Plan"
                        tip="Standard pays level monthly payouts for life. Escalating starts lower but increases 2% p.a. Basic pays for a fixed term and preserves more bequest value."
                      />
                      <div className="flex gap-2">
                        {(
                          [
                            { value: "basic" as const, label: "Basic" },
                            { value: "standard" as const, label: "Standard" },
                            { value: "escalating" as const, label: "Escalating" },
                          ]
                        ).map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setLiveCpfLifePlan(value)}
                            className={`flex-1 py-2 text-xs border transition-colors ${
                              liveCpfLifePlan === value
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CPF Life Payout Age */}
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <FieldTooltip
                          label="CPF Life Payout Age"
                          tip="Deferring payouts beyond 65 increases monthly payouts by approximately 7% per year deferred."
                        />
                        <span className="font-serif text-lg text-foreground">{liveCpfLifePayoutAge}</span>
                      </div>
                      <Slider
                        value={liveCpfLifePayoutAge}
                        onValueChange={(v) => setLiveCpfLifePayoutAge(v as number)}
                        min={65}
                        max={70}
                        step={1}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>65</span>
                        <span>70</span>
                      </div>
                    </div>

                    {/* Age 55 Strategy */}
                    <div className="space-y-2">
                      <FieldTooltip
                        label="Age 55 Strategy"
                        tip="How much you retain in the Retirement Account at 55. FRS keeps the Full Retirement Sum; BRS lets you withdraw more if you own property; ERS tops up to the Enhanced Retirement Sum for higher payouts."
                      />
                      <div className="relative">
                        <select
                          value={liveAge55Withdrawal}
                          onChange={(e) => setLiveAge55Withdrawal(e.target.value as "brs_withdrawal" | "frs_withdrawal" | "ers_pursuit")}
                          className="w-full appearance-none border-b border-border bg-transparent font-serif text-lg text-foreground py-2 pr-8 focus:outline-none focus:border-foreground cursor-pointer"
                        >
                          <option value="brs_withdrawal">Basic Retirement Sum</option>
                          <option value="frs_withdrawal">Full Retirement Sum</option>
                          <option value="ers_pursuit">Enhanced Retirement Sum</option>
                        </select>
                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <button
                      onClick={handleSave}
                      disabled={!isModified || saved}
                      className="w-full text-sm border border-border px-4 py-2.5 hover:border-foreground transition-colors disabled:opacity-50"
                    >
                      {saved ? "Saved ✓" : "Save Analysis"}
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Right: CPF results */}
              <CpfResultsChart
                expenseCoverage={expenseCoverage}
                chartData={cpfChartData}
                loading={cpfLoading}
                error={cpfError}
              />
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border bg-secondary/30 mt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fire Planner. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
