"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts"

export interface ChartRow {
  age: number
  cash: number
  investment: number
}

interface ResultsChartProps {
  retirementAge: number | null
  yearsToRetire: number | null
  chartData: ChartRow[]
  cashOnHand: number
  investmentPortfolio: number
  annualExpenses: number
  sellAtRetirement: boolean
  portfolioReturn: number
  loading: boolean
  error: string | null
}

export function ResultsChart({
  retirementAge,
  yearsToRetire,
  chartData,
  cashOnHand,
  investmentPortfolio,
  annualExpenses,
  sellAtRetirement,
  portfolioReturn,
  loading,
  error,
}: ResultsChartProps) {
  const returnRate = portfolioReturn / 100

  const fireNumber = sellAtRetirement
    ? annualExpenses * 25
    : returnRate > 0
      ? annualExpenses / returnRate
      : Infinity

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

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as ChartRow
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
        <div className="border-b border-border px-6 py-3 bg-primary">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground">
            Projected Independence Date
          </p>
        </div>
        <CardContent className="p-8 text-center">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : loading && retirementAge === null ? (
            <p className="text-muted-foreground">Calculating...</p>
          ) : retirementAge !== null && yearsToRetire !== null ? (
            <>
              <p className="font-serif text-7xl md:text-8xl text-foreground tracking-tight mb-4">
                {retirementAge}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
                Years of Age
              </p>
              <div className="h-px bg-border w-16 mx-auto mb-6" />
              <p className="text-lg text-foreground font-serif">
                {yearsToRetire === 0
                  ? "You have achieved financial independence"
                  : yearsToRetire === 1
                    ? "One year remaining"
                    : `${yearsToRetire} years from present`}
              </p>
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
              {fireNumber === Infinity ? "N/A" : formatCurrencyFull(Math.round(fireNumber))}
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
              {fireNumber !== Infinity && fireNumber > 0
                ? `${Math.round((presentNetWorth / fireNumber) * 100)}% of target`
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
      {retirementAge !== null && fireNumber !== Infinity && (
        <div className="border-t border-b border-border py-6 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            At age {retirementAge}, projected capital of{" "}
            <span className="text-foreground">{formatCurrencyFull(Math.round(fireNumber))}</span>{" "}
            will {sellAtRetirement ? "permit withdrawals of" : "generate"}{" "}
            <span className="text-foreground">{formatCurrencyFull(annualExpenses)}</span> annually
            {sellAtRetirement ? " following the 4% rule" : " from investment returns alone"}.
          </p>
        </div>
      )}
    </div>
  )
}
