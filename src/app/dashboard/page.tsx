"use client"

import { ResultsChart, ChartRow } from "@/components/results-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useEffect, useState } from "react"
import { MOCK_SNAPSHOTS } from "@/data/mock-snapshots"

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

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
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

const latestSnap = MOCK_SNAPSHOTS[MOCK_SNAPSHOTS.length - 1]
const latestCashAsset = latestSnap.assets.find((a) => a.name === "cash")
const latestInvAsset = latestSnap.assets.find((a) => a.name === "investment")

export default function DashboardPage() {
  // ── Snapshot selection (baseline for dashed overlay) ───────────────────
  const [selectedIndex, setSelectedIndex] = useState(MOCK_SNAPSHOTS.length - 1)
  const [results, setResults] = useState<(SnapshotResult | null)[]>(
    MOCK_SNAPSHOTS.map(() => null)
  )
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    MOCK_SNAPSHOTS.map(() => true)
  )

  useEffect(() => {
    MOCK_SNAPSHOTS.forEach(async (snap, i) => {
      try {
        const res = await fetch("/api/retirement-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: snap.age,
            ageElapsed: snap.ageElapsed,
            income: snap.income,
            expense: snap.expense,
            sellInvestmentAtRetirement: snap.sell_at_retirement,
            assetList: snap.assets,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as SnapshotResult
        setResults((prev) => {
          const next = [...prev]
          next[i] = data
          return next
        })
      } catch {
        // result stays null
      } finally {
        setLoadingStates((prev) => {
          const next = [...prev]
          next[i] = false
          return next
        })
      }
    })
  }, [])

  const selected = MOCK_SNAPSHOTS[selectedIndex]
  const selectedResult = results[selectedIndex]
  const cashAsset = selected.assets.find((a) => a.name === "cash")
  const investmentAsset = selected.assets.find((a) => a.name === "investment")

  // ── Live calculator — defaults to latest snapshot, fixed age ──────────
  const [liveIncome, setLiveIncome] = useState(latestSnap.income)
  const [liveExpense, setLiveExpense] = useState(latestSnap.expense)
  const [liveCash, setLiveCash] = useState(latestCashAsset?.value ?? 0)
  const [liveInvestment, setLiveInvestment] = useState(latestInvAsset?.value ?? 0)
  const [liveReturn, setLiveReturn] = useState(
    Math.round((latestInvAsset?.return ?? 0.07) * 100 * 10) / 10
  )
  const [liveResult, setLiveResult] = useState<SnapshotResult | null>(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSaved(false)
    setLiveLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/retirement-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: latestSnap.age,
            ageElapsed: latestSnap.ageElapsed,
            income: liveIncome,
            expense: liveExpense,
            sellInvestmentAtRetirement: latestSnap.sell_at_retirement,
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
  }, [liveIncome, liveExpense, liveCash, liveInvestment, liveReturn])

  // ── Derived chart data ─────────────────────────────────────────────────
  // Bars = live scenario
  const liveChartData: ChartRow[] = liveResult
    ? liveResult.fineProjection.liquidAssetDict.age.map((a, i) => ({
        age: a,
        cash: liveResult.fineProjection.liquidAssetDict.cash[i],
        investment: liveResult.fineProjection.liquidAssetDict.investment[i],
      }))
    : []

  // Dashed line = selected snapshot total
  const baselineOverlay = selectedResult
    ? selectedResult.fineProjection.liquidAssetDict.age.map((a, i) => ({
        age: a,
        total:
          selectedResult.fineProjection.liquidAssetDict.cash[i] +
          selectedResult.fineProjection.liquidAssetDict.investment[i],
      }))
    : undefined

  const isModified =
    liveIncome !== latestSnap.income ||
    liveExpense !== latestSnap.expense ||
    liveCash !== (latestCashAsset?.value ?? 0) ||
    liveInvestment !== (latestInvAsset?.value ?? 0) ||
    Math.abs(liveReturn / 100 - (latestInvAsset?.return ?? 0.07)) > 0.0001

  const ageDelta =
    liveResult && selectedResult
      ? selectedResult.retirementAge - liveResult.retirementAge
      : null

  const inputClass =
    "flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 border-b border-border text-xs text-muted-foreground">
            <span>
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
              The Journal of Financial Independence
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
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {MOCK_SNAPSHOTS.map((snap, i) => {
                const result = results[i]
                const loading = loadingStates[i]
                const netWorth = snap.assets.reduce((sum, a) => sum + a.value, 0)
                const isSelected = i === selectedIndex

                return (
                  <button key={snap.id} onClick={() => setSelectedIndex(i)} className="text-left w-full">
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
                            {formatDate(snap.created_date)}
                          </p>
                          {isSelected && <span className="text-xs text-foreground">●</span>}
                        </div>
                        <p className="font-serif text-xl text-foreground mb-0.5">
                          {formatCurrency(netWorth)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">Net worth</p>
                        <div className="h-px bg-border mb-3" />
                        {loading ? (
                          <p className="text-xs text-muted-foreground">Calculating…</p>
                        ) : result ? (
                          <p className="text-sm text-foreground font-serif">
                            Retire at age {result.retirementAge}
                          </p>
                        ) : (
                          <p className="text-xs text-destructive">Unavailable</p>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Two-column: calculator | analysis ───────────────────── */}
          <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
            {/* Left: sticky calculator panel */}
            <div className="lg:self-start">
              <Card className="sticky top-24 border-border bg-card">
                <CardContent className="p-0">
                  <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
                    <h2 className="font-serif text-xl text-foreground">What-If Calculator</h2>
                    {liveLoading && (
                      <span className="text-xs text-muted-foreground">Calculating…</span>
                    )}
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Annual Income
                      </Label>
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveIncome)}
                          onChange={(e) => setLiveIncome(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Annual Expenses
                      </Label>
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveExpense)}
                          onChange={(e) => setLiveExpense(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Cash Holdings
                      </Label>
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveCash)}
                          onChange={(e) => setLiveCash(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Investment Portfolio
                      </Label>
                      <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
                        <Input
                          type="text"
                          value={formatCurrency(liveInvestment)}
                          onChange={(e) => setLiveInvestment(parseCurrency(e.target.value))}
                          className={inputClass}
                        />
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
                      onClick={() => setSaved(true)}
                      disabled={saved}
                      className="w-full text-sm border border-border px-4 py-2.5 hover:border-foreground transition-colors disabled:opacity-50"
                    >
                      {saved ? "Saved ✓" : "Save Analysis"}
                    </button>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Age and withdrawal strategy are fixed to your latest snapshot.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: delta summary + analysis */}
            <div>
              {/* Delta summary — shown when live inputs differ from defaults */}
              {isModified && liveResult && selectedResult && (
                <div className="mb-8 border border-border bg-secondary/30 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">
                    Live vs Baseline — {formatDate(selected.created_date)}
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

              {/* Analysis header */}
              <div className="mb-8 flex items-center gap-4">
                <h3 className="font-serif text-lg text-foreground whitespace-nowrap">
                  Analysis — {formatDate(selected.created_date)}
                </h3>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Bars = live scenario, dashed line = selected baseline */}
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
                sellAtRetirement={latestSnap.sell_at_retirement}
                loading={liveLoading && liveResult === null}
                error={null}
                overlayData={baselineOverlay}
                overlayLabel="Saved snapshot"
              />
            </div>
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
