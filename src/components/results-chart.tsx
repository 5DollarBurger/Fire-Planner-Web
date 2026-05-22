"use client"

import { Card, CardContent } from "@/components/ui/card"
import { GoogleLogin } from "@react-oauth/google"
import {
    Bar,
    ComposedChart,
    CartesianGrid,
    Line,
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
  overlayData?: { age: number; total: number }[]
  overlayLabel?: string
  overlayRetirementAge?: number | null
  isAuthenticated?: boolean
  onSignInAndSave?: (credential: string) => void
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
  overlayData,
  overlayLabel = "Baseline",
  overlayRetirementAge,
  isAuthenticated = false,
  onSignInAndSave,
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

  const mergedData = chartData.slice(0, -1).map((row) => {
    const o = overlayData?.find((d) => d.age === row.age)
    return { ...row, liveTotal: o?.total }
  })

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
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-stretch">
            {/* Countdown */}
            <div className="flex-1 text-center">
              {error ? (
                <p className="text-destructive">{error}</p>
              ) : loading && retirementAge === null ? (
                <p className="text-muted-foreground">Calculating...</p>
              ) : retirementAge !== null && yearsToRetire !== null ? (
                <>
                  {yearsToRetire === 0 && !monthsToRetire && !daysToRetire ? (
                    <p className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
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
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block w-px bg-border self-stretch" />
            {/* Horizontal divider (mobile) */}
            <div className="block sm:hidden h-px bg-border w-full" />

            {/* Stat column */}
            <div className="flex sm:flex-col gap-6 sm:gap-0 sm:w-44 sm:justify-center">
              <div className="flex-1 sm:flex-none sm:py-4">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  Target Capital
                </p>
                <p className="font-serif text-xl text-foreground">
                  {targetFIRE === null ? "—" : formatCurrencyFull(Math.round(targetFIRE))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sellAtRetirement ? "Cash out at retirement" : "From returns alone"}
                </p>
              </div>
              <div className="hidden sm:block h-px bg-border" />
              <div className="flex-1 sm:flex-none sm:py-4">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  Present Net Worth
                </p>
                <p className="font-serif text-xl text-foreground">
                  {formatCurrencyFull(presentNetWorth)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {targetFIRE !== null && targetFIRE > 0
                    ? `${Math.round((presentNetWorth / targetFIRE) * 100)}% of target`
                    : "Cash and investments combined"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wealth Projection Chart */}
      {chartData.length > 0 && (
        <Card className="border-border bg-card">
          <div className="border-b border-border px-6 py-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">Wealth Projection</h3>
              <p className="text-xs text-muted-foreground mt-1">Net worth over time, nominal values</p>
            </div>
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary" />
                <span className="text-muted-foreground">Cash</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent" />
                <span className="text-muted-foreground">Investments</span>
              </div>
              {overlayData && overlayData.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 border-t-2 border-dashed border-muted-foreground" />
                  <span className="text-muted-foreground">{overlayLabel}</span>
                </div>
              )}
            </div>
          </div>
          <CardContent className="p-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={mergedData}
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
                  {overlayRetirementAge != null && (
                    <ReferenceLine
                      x={overlayRetirementAge}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: "Prev. FIRE", position: "top", fill: "var(--muted-foreground)", fontSize: 10, dy: 14 }}
                    />
                  )}
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
                  {overlayData && overlayData.length > 0 && (
                    <Line
                      dataKey="liveTotal"
                      name="Live scenario"
                      type="monotone"
                      stroke="var(--muted-foreground)"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      connectNulls
                    />
                  )}
                </ComposedChart>
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
            {sellAtRetirement ? " by cashing out investments at retirement" : " from investment returns alone"}.
          </p>
        </div>
      )}

      {/* Save Results CTA — shown to guests once a result is available */}
      {!isAuthenticated && onSignInAndSave && chartData.length > 0 && (
        <div className="border border-border bg-card p-8 text-center space-y-4">
          <p className="font-serif text-xl text-foreground">Track Your Progress</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Save this analysis and see how your FIRE date improves over time.
          </p>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={({ credential }) => onSignInAndSave(credential!)}
              onError={() => {}}
              text="signin_with"
              shape="rectangular"
              size="large"
            />
          </div>
          <p className="text-xs text-muted-foreground">Free — takes 10 seconds</p>
        </div>
      )}
    </div>
  )
}
