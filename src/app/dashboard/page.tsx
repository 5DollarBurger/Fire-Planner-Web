"use client"

import { ResultsChart, ChartRow } from "@/components/results-chart"
import { Card, CardContent } from "@/components/ui/card"
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

export default function DashboardPage() {
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
        const payload = {
          age: snap.age,
          ageElapsed: snap.ageElapsed,
          income: snap.income,
          expense: snap.expense,
          sellInvestmentAtRetirement: snap.sell_at_retirement,
          assetList: snap.assets,
        }
        const res = await fetch("/api/retirement-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as SnapshotResult
        setResults((prev) => {
          const next = [...prev]
          next[i] = data
          return next
        })
      } catch {
        // result stays null — shown as unavailable
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
  const selectedLoading = loadingStates[selectedIndex]

  const cashAsset = selected.assets.find((a) => a.name === "cash")
  const investmentAsset = selected.assets.find((a) => a.name === "investment")

  const chartData: ChartRow[] = selectedResult
    ? selectedResult.fineProjection.liquidAssetDict.age.map((a, i) => ({
        age: a,
        cash: selectedResult.fineProjection.liquidAssetDict.cash[i],
        investment: selectedResult.fineProjection.liquidAssetDict.investment[i],
      }))
    : []

  return (
    <div className="min-h-screen">
      {/* Header — same masthead style as landing */}
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
            <a
              href="/landing_insights"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Calculator
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Research
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
          </nav>
        </div>
      </header>

      {/* Dashboard */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page title */}
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
                Account Dashboard
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
                Your Progress
              </h2>
            </div>
            <a
              href="/landing_insights"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors border border-border px-4 py-2"
            >
              New Analysis →
            </a>
          </div>

          {/* Snapshot History */}
          <div className="mb-12">
            <div className="mb-5 flex items-center gap-4">
              <h3 className="font-serif text-lg text-foreground whitespace-nowrap">
                Snapshot History
              </h3>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {MOCK_SNAPSHOTS.map((snap, i) => {
                const result = results[i]
                const loading = loadingStates[i]
                const netWorth = snap.assets.reduce((sum, a) => sum + a.value, 0)
                const isSelected = i === selectedIndex

                return (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedIndex(i)}
                    className="text-left w-full"
                  >
                    <Card
                      className={`border transition-colors ${
                        isSelected
                          ? "border-foreground bg-card"
                          : "border-border bg-secondary/30 hover:border-muted-foreground"
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                            {formatDate(snap.created_date)}
                          </p>
                          {isSelected && (
                            <span className="text-xs uppercase tracking-wider text-foreground">
                              ●
                            </span>
                          )}
                        </div>
                        <p className="font-serif text-2xl text-foreground mb-1">
                          {formatCurrency(netWorth)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">Net worth</p>
                        <div className="space-y-1 text-xs text-muted-foreground mb-4">
                          <p>Income: {formatCurrency(snap.income)}</p>
                          <p>Expenses: {formatCurrency(snap.expense)}</p>
                        </div>
                        <div className="h-px bg-border mb-3" />
                        {loading ? (
                          <p className="text-xs text-muted-foreground">Calculating…</p>
                        ) : result ? (
                          <p className="font-serif text-sm text-foreground">
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

          {/* Analysis section */}
          <div className="mb-8 flex items-center gap-4">
            <h3 className="font-serif text-lg text-foreground whitespace-nowrap">
              Analysis — {formatDate(selected.created_date)}
            </h3>
            <div className="flex-1 h-px bg-border" />
          </div>

          <ResultsChart
            retirementAge={selectedResult?.retirementAge ?? null}
            yearsToRetire={selectedResult?.fineProjection.yearsToRetire ?? null}
            monthsToRetire={selectedResult?.fineProjection.monthsToRetire ?? null}
            daysToRetire={selectedResult?.fineProjection.daysToRetire ?? null}
            targetFIRE={selectedResult?.fineProjection.targetFIRE ?? null}
            chartData={chartData}
            cashOnHand={cashAsset?.value ?? 0}
            investmentPortfolio={investmentAsset?.value ?? 0}
            annualExpenses={selected.expense}
            sellAtRetirement={selected.sell_at_retirement}
            loading={selectedLoading}
            error={null}
          />
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
