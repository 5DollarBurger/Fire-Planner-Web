"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface CpfChartRow {
  age: number
  oa: number
  ra: number
  ma: number
  withdrawal: number
  expense: number
}

interface CoverageTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}

interface BalanceTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}

interface CpfResultsChartProps {
  expenseCoverage: number | null
  chartData: CpfChartRow[]
  loading: boolean
  error: string | null
}

export function CpfResultsChart({ expenseCoverage, chartData: rawChartData, loading, error }: CpfResultsChartProps) {
  // Drop the final partial year to match the wealth projection chart's visible range
  const chartData = rawChartData.slice(0, -1)
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value}`
  }

  const formatCurrencyFull = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)

  const coveragePct = expenseCoverage !== null ? Math.round(expenseCoverage * 100) : null

  const coverageLabel =
    coveragePct === null
      ? null
      : coveragePct >= 80
      ? "Strong coverage"
      : coveragePct >= 50
      ? "Partial coverage"
      : "Limited coverage"

  const CoverageTooltip = ({ active, payload, label }: CoverageTooltipProps) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="bg-card border border-border p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Age {label}</p>
        <div className="space-y-1 font-serif">
          {payload.map((p) => (
            <p key={p.name} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrencyFull(p.value)}
            </p>
          ))}
        </div>
      </div>
    )
  }

  const BalanceTooltip = ({ active, payload, label }: BalanceTooltipProps) => {
    if (!active || !payload || !payload.length) return null
    const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
    return (
      <div className="bg-card border border-border p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Age {label}</p>
        <div className="space-y-1 font-serif">
          {payload.map((p) => (
            <p key={p.name} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrencyFull(p.value)}
            </p>
          ))}
          <div className="h-px bg-border my-2" />
          <p className="text-sm font-semibold text-foreground">Total: {formatCurrencyFull(total)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Coverage Metric Card */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-4 bg-primary flex items-center justify-between gap-4 flex-wrap">
          <p className="font-serif text-xl md:text-2xl text-primary-foreground tracking-tight">
            Coverage from CPF so far
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
            No future contributions assumed
          </p>
        </div>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-stretch">
            {/* Big number */}
            <div className="flex-1 text-center">
              {error ? (
                <p className="text-destructive">{error}</p>
              ) : loading && expenseCoverage === null ? (
                <p className="text-muted-foreground">Calculating...</p>
              ) : coveragePct !== null ? (
                <>
                  <p className="font-serif text-7xl md:text-8xl text-foreground tracking-tight leading-none">
                    {coveragePct}
                    <span className="text-4xl md:text-5xl">%</span>
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-4">
                    of future expenses covered by your contributions so far
                  </p>
                </>
              ) : null}
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block w-px bg-border self-stretch" />
            <div className="block sm:hidden h-px bg-border w-full" />

            {/* Label */}
            <div className="sm:w-44 flex sm:flex-col items-center sm:items-start sm:justify-center gap-4 sm:gap-0">
              <div className="sm:py-4">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Assessment</p>
                <p className="font-serif text-xl text-foreground">{coverageLabel ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {coveragePct !== null && coveragePct < 100
                    ? `${100 - coveragePct}% must come from other assets`
                    : coveragePct !== null && coveragePct >= 100
                    ? "CPF alone covers all future expenses"
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal vs Expense Chart */}
      {chartData.length > 0 && (
        <Card className="border-border bg-card">
          <div className="border-b border-border px-6 py-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">CPF Withdrawals vs Future Expenses</h3>
              <p className="text-xs text-muted-foreground mt-1">Annual amounts · no future contributions · nominal values</p>
            </div>
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3" style={{ backgroundColor: "var(--chart-4)" }} />
                <span className="text-muted-foreground">Withdrawal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t-2 border-dashed border-destructive" />
                <span className="text-muted-foreground">Expense</span>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="1 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip content={<CoverageTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                  <Bar dataKey="withdrawal" name="Withdrawal" fill="var(--chart-4)" radius={0} />
                  <Line
                    dataKey="expense"
                    name="Expense"
                    type="monotone"
                    stroke="var(--destructive)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Balances Chart */}
      {chartData.length > 0 && (
        <Card className="border-border bg-card">
          <div className="border-b border-border px-6 py-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">CPF Account Balances</h3>
              <p className="text-xs text-muted-foreground mt-1">End-of-year balances by account</p>
            </div>
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary" />
                <span className="text-muted-foreground">OA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent" />
                <span className="text-muted-foreground">RA / SA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3" style={{ backgroundColor: "var(--muted-foreground)" }} />
                <span className="text-muted-foreground">MA</span>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="1 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip content={<BalanceTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                  <Bar dataKey="oa" name="OA" stackId="cpf" fill="var(--primary)" radius={0} />
                  <Bar dataKey="ra" name="RA / SA" stackId="cpf" fill="var(--accent)" radius={0} />
                  <Bar dataKey="ma" name="MA" stackId="cpf" fill="var(--muted-foreground)" radius={0} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary note */}
      {expenseCoverage !== null && (
        <div className="border-t border-b border-border py-6 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Based on what you have contributed to date — with no further contributions —
            your CPF will cover <span className="text-foreground">{coveragePct}%</span> of your
            inflation-adjusted future expenses. The remaining{" "}
            <span className="text-foreground">{100 - (coveragePct ?? 0)}%</span> will need to
            come from your other assets.
          </p>
        </div>
      )}
    </div>
  )
}
