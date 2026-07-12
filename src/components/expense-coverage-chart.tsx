"use client"

import { Card, CardContent } from "@/components/ui/card"
import { type ExpenseProjection } from "@/lib/api"
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

export type { ExpenseProjection }

const SERIES = [
  { key: "income",     label: "Income",     color: "var(--chart-1)" },
  { key: "cpf",        label: "CPF",        color: "var(--chart-4)" },
  { key: "cash",       label: "Cash",       color: "var(--chart-5)" },
  { key: "investment", label: "Investment", color: "var(--chart-2)" },
  { key: "shortfall",  label: "Shortfall",  color: "var(--chart-3)" },
] as const

type ChartRow = { age: number } & Record<typeof SERIES[number]["key"], number> & { total: number }

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}

function CoverageTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const formatFull = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
  const total = payload.find((p) => p.name === "Total Expenses")
  const bars = payload.filter((p) => p.name !== "Total Expenses")
  return (
    <div className="bg-card border border-border p-4 shadow-sm min-w-[160px]">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Age {label}</p>
      <div className="space-y-1 font-serif text-sm">
        {bars.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatFull(p.value)}</p>
        ))}
        {total && (
          <>
            <div className="h-px bg-border my-1" />
            <p className="text-foreground">{total.name}: {formatFull(total.value)}</p>
          </>
        )}
      </div>
    </div>
  )
}

interface ExpenseCoverageChartProps {
  expenseProjection: ExpenseProjection
  retirementAge: number
}

export function ExpenseCoverageChart({ expenseProjection, retirementAge }: ExpenseCoverageChartProps) {
  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v}`
  }

  // Drop the final partial year — it has zero wealth but non-zero expenses,
  // causing a visual mismatch with the wealth projection chart.
  const data: ChartRow[] = expenseProjection.age.slice(0, -1).map((a, i) => ({
    age: a,
    income:     expenseProjection.income[i],
    cpf:        expenseProjection.cpf[i],
    cash:       expenseProjection.cash[i],
    investment: expenseProjection.investment[i],
    shortfall:  expenseProjection.shortfall[i],
    total:      expenseProjection.total[i],
  }))

  return (
    <Card className="border-border bg-card">
      <div className="border-b border-border px-6 py-4 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-serif text-lg text-foreground">Expense Coverage</h3>
          <p className="text-xs text-muted-foreground mt-1">
            How each source funds expenses from age {expenseProjection.age[0]} · retirement at {retirementAge}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs flex-wrap">
          {SERIES.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-6 border-t-2 border-dashed border-destructive" />
            <span className="text-muted-foreground">Total expenses</span>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
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
              {SERIES.map(({ key, label, color }) => (
                <Bar key={key} dataKey={key} name={label} stackId="coverage" fill={color} radius={0} />
              ))}
              <Line
                dataKey="total"
                name="Total Expenses"
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
  )
}
