"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartRow }>
}

export interface ChartRow {
  age: number
  cash: number
  investment: number
}

interface ResultsChartProps {
  retirementAge: number | null
  yearsToRetire: number | null
  monthsToRetire: number | null
  daysToRetire: number | null
  targetFIRE: number | null
  chartData: ChartRow[]
  cashOnHand: number
  investmentPortfolio: number
  annualExpenses: number
  sellAtRetirement: boolean
  loading: boolean
  error: string | null
}

export function ResultsChart({
  retirementAge,
  yearsToRetire,
  monthsToRetire,
  daysToRetire,
  targetFIRE,
  chartData,
  cashOnHand,
  investmentPortfolio,
  annualExpenses,
  sellAtRetirement,
  loading,
  error,
}: ResultsChartProps) {
  const presentNetWorth = cashOnHand + investmentPortfolio

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

  const fireDate = (() => {
    if (yearsToRetire === null) return null
    const d = new Date()
    d.setFullYear(d.getFullYear() + yearsToRetire)
    d.setMonth(d.getMonth() + (monthsToRetire ?? 0))
    d.setDate(d.getDate() + (daysToRetire ?? 0))
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  })()

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = data.cash + data.investment
      return (
        <div className="bg-card border border-border p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Age {data.age}
          </p>
          <div className="space-y-1 font-serif">
            <p className="text-sm text-foreground">Cash: {formatCurrencyFull(data.cash)}</p>
            <p className="text-sm text-accent">Investments: {formatCurrencyFull(data.investment)}</p>
            <div className="h-px bg-border my-2" />
            <p className="text-sm font-semibold text-foreground">
              Total: {formatCurrencyFull(total)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Main Result Card */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-4 bg-primary flex items-center justify-between gap-4 flex-wrap">
          <p className="font-serif text-xl md:text-2xl text-primary-foreground tracking-tight">
            Projected Independence Date
          </p>
          {fireDate ? (
            <p className="font-serif text-xl md:text-2xl text-primary-foreground tracking-tight">
              {fireDate}
            </p>
          ) : null}
        </div>
        <CardContent className="p-8 text-center">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : loading && retirementAge === null ? (
            <p className="text-muted-foreground">Calculating...</p>
          ) : retirementAge !== null && yearsToRetire !== null ? (
            <>
              {yearsToRetire === 0 && !monthsToRetire && !daysToRetire ? (
                <p className="font-serif text-3xl md:text-4xl text-foreground tracking-tight mb-6">
                  You have achieved financial independence
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-center gap-8 md:gap-12 mb-4">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-6xl md:text-7xl text-foreground tracking-tight leading-none">
                        {yearsToRetire}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-2">
                        {yearsToRetire === 1 ? "Year" : "Years"}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-6xl md:text-7xl text-foreground tracking-tight leading-none">
                        {monthsToRetire ?? 0}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-2">
                        {monthsToRetire === 1 ? "Month" : "Months"}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-6xl md:text-7xl text-foreground tracking-tight leading-none">
                        {daysToRetire ?? 0}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-2">
                        {daysToRetire === 1 ? "Day" : "Days"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
                    to Independence
                  </p>
                  <div className="h-px bg-border w-16 mx-auto mb-6" />
                  <p className="text-lg text-foreground font-serif">
                    Retire by age {retirementAge}
                  </p>
                </>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Key Figures */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Target Capital
            </p>
            <p className="font-serif text-2xl text-foreground">
              {targetFIRE === null ? "—" : formatCurrencyFull(Math.round(targetFIRE))}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {sellAtRetirement ? "Based on 4% withdrawal rule" : "To sustain living expenses from returns"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Present Net Worth
            </p>
            <p className="font-serif text-2xl text-foreground">
              {formatCurrencyFull(presentNetWorth)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {targetFIRE !== null && targetFIRE > 0
                ? `${Math.round((presentNetWorth / targetFIRE) * 100)}% of target`
                : "Cash and investments combined"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wealth Projection Chart */}
      {chartData.length > 0 && (
        <Card className="border-border bg-card">
          <div className="border-b border-border px-6 py-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">Wealth Projection</h3>
              <p className="text-xs text-muted-foreground mt-1">Net worth over time, nominal values</p>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary" />
                <span className="text-muted-foreground">Cash</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent" />
                <span className="text-muted-foreground">Investments</span>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                  {retirementAge !== null && (
                    <ReferenceLine
                      x={retirementAge}
                      stroke="var(--foreground)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: "FIRE", position: "top", fill: "var(--foreground)", fontSize: 10 }}
                    />
                  )}
                  <Bar dataKey="cash" name="Cash" stackId="wealth" fill="var(--primary)" radius={0} />
                  <Bar dataKey="investment" name="Investments" stackId="wealth" fill="var(--accent)" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Note */}
      {retirementAge !== null && targetFIRE !== null && (
        <div className="border-t border-b border-border py-6 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            At age {retirementAge}, projected capital of{" "}
            <span className="text-foreground">{formatCurrencyFull(Math.round(targetFIRE))}</span>{" "}
            will {sellAtRetirement ? "permit withdrawals of" : "generate"}{" "}
            <span className="text-foreground">{formatCurrencyFull(annualExpenses)}</span> annually
            {sellAtRetirement ? " following the 4% rule" : " from investment returns alone"}.
          </p>
        </div>
      )}
    </div>
  )
}
