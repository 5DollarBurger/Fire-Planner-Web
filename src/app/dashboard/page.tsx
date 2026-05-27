"use client"

import { FieldTooltip } from "@/components/field-tooltip"
import { ChartRow, ResultsChart } from "@/components/results-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/useAuth"
import { ApiProfile, ApiSnapshot, computeAgeFromDOB, createSnapshot, getProfile, listSnapshots } from "@/lib/api"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import defaultInputs from "@/data/personas/default/inputs.json"
import defaultRetirement from "@/data/personas/default/retirement-age.json"

type FineProjection = {
  yearsToRetire: number
  monthsToRetire: number
  daysToRetire: number
  targetFIRE: number
  liquidAssetDict: {
    cash: number[]
    investment: number[]
    total: number[]
    age: number[]
  }
}

type SnapshotResult = {
  retirementAge: number
  yearsToRetire: number
  targetFIRE: number
  fineProjection: FineProjection
}

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

function toSnapshotResult(snap: ApiSnapshot): SnapshotResult {
  const total = snap.projection.cash.map((c, i) => c + snap.projection.investment[i])
  return {
    retirementAge: snap.retirement_age,
    yearsToRetire: snap.years_to_retire,
    targetFIRE: snap.target_fire,
    fineProjection: {
      yearsToRetire: snap.years_to_retire,
      monthsToRetire: snap.months_to_retire,
      daysToRetire: snap.days_to_retire,
      targetFIRE: snap.target_fire,
      liquidAssetDict: {
        cash: snap.projection.cash,
        investment: snap.projection.investment,
        total,
        age: snap.projection.age,
      },
    },
  }
}

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

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, accessToken, logout } = useAuth()

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated === false) {
      // isAuthenticated starts false on first render (SSR), wait for hydration
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
      getProfile(accessToken).then(setProfile).catch(console.error),
      listSnapshots(accessToken).then(setSnapshots).catch(console.error),
    ]).finally(() => setSnapshotsLoading(false))
  }, [accessToken])

  // ── Snapshot selection ─────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selected = snapshots[selectedIndex]
  const selectedResult = selected ? toSnapshotResult(selected) : null
  const cashAsset = selected?.assets.find((a) => a.name === "cash")
  const investmentAsset = selected?.assets.find((a) => a.name === "investment")

  // Latest snapshot drives the live calculator age
  const latestSnap = snapshots[0]

  // ── Live calculator defaults ───────────────────────────────────────────
  const [liveIncome, setLiveIncome] = useState(0)
  const [liveExpense, setLiveExpense] = useState(0)
  const [liveCash, setLiveCash] = useState(0)
  const [liveInvestment, setLiveInvestment] = useState(0)
  const [liveReturn, setLiveReturn] = useState(7)
//   const [liveSellAtRetirement, setLiveSellAtRetirement] = useState(true)
  const [liveResult, setLiveResult] = useState<SnapshotResult | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Seed live inputs when snapshots load or selected snapshot changes
  useEffect(() => {
    if (!snapshotsLoading && !latestSnap) {
      setLiveIncome(defaultInputs.income)
      setLiveExpense(defaultInputs.expense)
      setLiveCash(DEFAULT_CASH?.value ?? 30000)
      setLiveInvestment(DEFAULT_INV?.value ?? 50000)
      setLiveReturn(Math.round((DEFAULT_INV?.return ?? 0.07) * 100 * 10) / 10)
    //   setLiveSellAtRetirement(defaultInputs.sellInvestmentAtRetirement)
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
    // setLiveSellAtRetirement(latestSnap.sell_at_retirement)
    setLiveResult(null)
    setSaved(false)
  }, [latestSnap, snapshotsLoading])

  // ── Debounced live fetch ───────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ageInfo = profile?.date_of_birth
      ? computeAgeFromDOB(profile.date_of_birth)
      : latestSnap
        ? { age: latestSnap.age, ageElapsed: latestSnap.age_elapsed }
        : null
    if (!ageInfo) return
    setSaved(false)
    setLiveLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/retirement-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: ageInfo.age,
            ageElapsed: ageInfo.ageElapsed,
            income: liveIncome,
            expense: liveExpense,
            // sellInvestmentAtRetirement: liveSellAtRetirement,
            assetList: [
              { name: "cash", value: liveCash, return: 0 },
              { name: "investment", value: liveInvestment, return: liveReturn / 100 },
            ],
          }),
        })
        if (res.ok) setLiveResult((await res.json()) as SnapshotResult)
      } finally {
        setLiveLoading(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
//   }, [liveIncome, liveExpense, liveCash, liveInvestment, liveReturn, liveSellAtRetirement, latestSnap, profile])
  }, [liveIncome, liveExpense, liveCash, liveInvestment, liveReturn, latestSnap, profile])

  // ── Derived chart data ─────────────────────────────────────────────────
  const liveChartData: ChartRow[] = liveResult
    ? liveResult.fineProjection.liquidAssetDict.age.map((a, i) => ({
        age: a,
        cash: liveResult.fineProjection.liquidAssetDict.cash[i],
        investment: liveResult.fineProjection.liquidAssetDict.investment[i],
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
      Math.abs(liveReturn / 100 - (latestInvAsset?.return ?? 0.07)) > 0.0001

  const ageDelta =
    liveResult && selectedResult
      ? selectedResult.retirementAge - liveResult.retirementAge
      : null

  // ── Save Analysis ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!isModified || !accessToken || !liveResult) return
    const { age: dobAge, ageElapsed } = profile?.date_of_birth
      ? computeAgeFromDOB(profile.date_of_birth)
      : latestSnap
        ? { age: latestSnap.age, ageElapsed: latestSnap.age_elapsed }
        : { age: 0, ageElapsed: 0 }
    const proj = liveResult.fineProjection.liquidAssetDict
    try {
      const snap = await createSnapshot(
        {
          age: dobAge,
          age_elapsed: ageElapsed,
          income: liveIncome,
          expense: liveExpense,
          assets: [
            { name: "cash", value: liveCash, return: 0 },
            { name: "investment", value: liveInvestment, return: liveReturn / 100 },
          ],
        //   sell_at_retirement: liveSellAtRetirement,
          retirement_age: liveResult.retirementAge,
          years_to_retire: liveResult.fineProjection.yearsToRetire,
          months_to_retire: liveResult.fineProjection.monthsToRetire,
          days_to_retire: liveResult.fineProjection.daysToRetire,
          target_fire: liveResult.fineProjection.targetFIRE,
          projection: { cash: proj.cash, investment: proj.investment, age: proj.age },
        },
        accessToken,
      )
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
//   }, [isModified, accessToken, liveResult, latestSnap, profile, liveIncome, liveExpense, liveCash, liveInvestment, liveReturn, liveSellAtRetirement])  // latestSnap kept for age fallback
  }, [isModified, accessToken, liveResult, latestSnap, profile, liveIncome, liveExpense, liveCash, liveInvestment, liveReturn])  // latestSnap kept for age fallback

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

          {/* ── Snapshot History — full width, compact cards ─────── */}
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
                const result = toSnapshotResult(snap)
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
                        <div className="h-px bg-border mb-3" />
                        <p className="text-sm text-foreground font-serif">
                          Retire at age {result.retirementAge}
                        </p>
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
                            {/* <div>
                              <p className="text-xs text-muted-foreground">Strategy</p>
                              <p className="text-xs font-serif text-foreground">
                                {snap.sell_at_retirement ? "Cash out" : "Returns only"}
                              </p>
                            </div> */}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Delta summary — full width, shown when live inputs differ ── */}
          {isModified && liveResult && selectedResult && (
            <div className="mb-8 border border-border bg-secondary/30 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">
                Live vs Baseline — {selected && formatDate(selected.created_at)}
              </p>
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
            </div>
          )}

          {/* ── Analysis header — full width ─────────────────────────── */}
          <div className="mb-8 flex items-center gap-4">
            <h3 className="font-serif text-lg text-foreground whitespace-nowrap">
              {selected ? `Analysis — ${formatDate(selected.created_at)}` : "Analysis"}
            </h3>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Two-column: calculator | results (tops aligned) ─────── */}
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
                      tip="Day-to-day quality-of-life expenses excluding taxes, mortgage, pension, and investment contributions. Include short-term debt repayments that are regularly rolled over (e.g. credit card, car loan payments)."
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

                  {/* <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Sell at Retirement
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {liveSellAtRetirement ? "Cash out at retirement" : "Live on investment returns"}
                      </p>
                    </div>
                    <Switch
                      checked={liveSellAtRetirement}
                      onCheckedChange={setLiveSellAtRetirement}
                    />
                  </div> */}

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

            {/* Right: ResultsChart — bars = live scenario, dashed = selected baseline */}
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
            //   sellAtRetirement={liveSellAtRetirement}
              loading={liveLoading && liveResult === null}
              error={null}
              overlayData={baselineOverlay}
              overlayLabel="Prev. Projection"
              overlayRetirementAge={selectedResult?.retirementAge ?? null}
            />
          </div>
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
