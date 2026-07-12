"use client"

import { FieldTooltip } from "@/components/field-tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ChevronDown, ChevronUp } from "lucide-react"

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

export type CpfLifePlan = "basic" | "standard" | "escalating"
export type Age55Withdrawal = "brs_withdrawal" | "frs_withdrawal" | "ers_pursuit"

export interface CpfFormProps {
  age: number
  setAge: (v: number) => void
  annualExpenses: number
  setAnnualExpenses: (v: number) => void
  oa: number
  setOa: (v: number) => void
  sa: number
  setSa: (v: number) => void
  ma: number
  setMa: (v: number) => void
  cpfLifePlan: CpfLifePlan
  setCpfLifePlan: (v: CpfLifePlan) => void
  cpfLifePayoutAge: number
  setCpfLifePayoutAge: (v: number) => void
  age55Withdrawal: Age55Withdrawal
  setAge55Withdrawal: (v: Age55Withdrawal) => void
}

export function CpfForm({
  age,
  setAge,
  annualExpenses,
  setAnnualExpenses,
  oa,
  setOa,
  sa,
  setSa,
  ma,
  setMa,
  cpfLifePlan,
  setCpfLifePlan,
  cpfLifePayoutAge,
  setCpfLifePayoutAge,
  age55Withdrawal,
  setAge55Withdrawal,
}: CpfFormProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)

  const parseCurrency = (value: string) => {
    const number = parseInt(value.replace(/[^0-9]/g, ""), 10)
    return isNaN(number) ? 0 : number
  }

  const cpfLifePlanLabels: Record<CpfLifePlan, string> = {
    standard: "Standard",
    escalating: "Escalating",
    basic: "Basic",
  }

  const age55WithdrawalLabels: Record<Age55Withdrawal, string> = {
    frs_withdrawal: "Full Retirement Sum",
    brs_withdrawal: "Basic Retirement Sum",
    ers_pursuit: "Enhanced Retirement Sum",
  }

  return (
    <Card className="lg:sticky lg:top-24 border-border bg-card">
      <CardContent className="p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-serif text-xl text-foreground">Your CPF Balances Today</h2>
          <p className="text-xs text-muted-foreground mt-1">Enter what you have contributed to date — no future contributions are assumed.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="cpf-age" className="text-xs uppercase tracking-wider text-muted-foreground">
              Current Age
            </Label>
            <Input
              id="cpf-age"
              type="number"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 0)}
              onBlur={(e) => {
                const v = parseInt(e.target.value)
                setAge(isNaN(v) ? 18 : Math.min(Math.max(v, 18), 100))
              }}
              min={18}
              max={100}
              className="font-serif text-lg border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          {/* Annual Expenses */}
          <div className="space-y-2">
            <FieldTooltip
              htmlFor="cpf-expenses"
              label="Annual Expenses"
              tip="Projected annual expenses in today's dollars. Used to compute how much of your retirement costs CPF will cover."
            />
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="cpf-expenses"
                type="text"
                value={formatCurrency(annualExpenses)}
                onChange={(e) => setAnnualExpenses(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={annualExpenses} onChange={setAnnualExpenses} />
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* OA */}
          <div className="space-y-2">
            <FieldTooltip
              htmlFor="cpf-oa"
              label="Ordinary Account (OA)"
              tip="Current OA balance. Earns 2.5% p.a. Can be withdrawn from age 55 after meeting the Retirement Sum."
            />
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="cpf-oa"
                type="text"
                value={formatCurrency(oa)}
                onChange={(e) => setOa(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={oa} onChange={setOa} />
            </div>
          </div>

          {/* SA / RA */}
          <div className="space-y-2">
            <FieldTooltip
              htmlFor="cpf-sa"
              label={age >= 55 ? "Retirement Account (RA)" : "Special Account (SA)"}
              tip={age >= 55
                ? "Current RA balance. Earns 4% p.a. Funds your CPF Life premium and provides lifelong monthly payouts."
                : "Current SA balance. Earns 4% p.a. Transferred to Retirement Account at age 55 to meet the Retirement Sum."}
            />
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="cpf-sa"
                type="text"
                value={formatCurrency(sa)}
                onChange={(e) => setSa(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={sa} onChange={setSa} />
            </div>
          </div>

          {/* MA */}
          <div className="space-y-2">
            <FieldTooltip
              htmlFor="cpf-ma"
              label="MediSave Account (MA)"
              tip="Current MA balance. Earns 4% p.a. Capped at the Basic Healthcare Sum. Overflow moves to SA or RA."
            />
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="cpf-ma"
                type="text"
                value={formatCurrency(ma)}
                onChange={(e) => setMa(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={ma} onChange={setMa} />
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* CPF Life Plan */}
          <div className="space-y-2">
            <FieldTooltip
              htmlFor="cpf-life-plan"
              label="CPF Life Plan"
              tip="Standard pays level monthly payouts for life. Escalating starts lower but increases 2% p.a. Basic pays for a fixed term and preserves more bequest value."
            />
            <div className="flex gap-2">
              {(Object.entries(cpfLifePlanLabels) as [CpfLifePlan, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCpfLifePlan(key)}
                  className={`flex-1 py-2 text-xs border transition-colors ${
                    cpfLifePlan === key
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
              <span className="font-serif text-lg text-foreground">{cpfLifePayoutAge}</span>
            </div>
            <Slider
              value={cpfLifePayoutAge}
              onValueChange={(v) => setCpfLifePayoutAge(v as number)}
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

          {/* Age 55 Withdrawal */}
          <div className="space-y-2">
            <FieldTooltip
              htmlFor="cpf-age55"
              label="Age 55 Strategy"
              tip="How much you retain in the Retirement Account at 55. FRS keeps the Full Retirement Sum; BRS lets you withdraw more if you own property; ERS tops up to the Enhanced Retirement Sum for higher payouts."
            />
            <div className="relative">
              <select
                id="cpf-age55"
                value={age55Withdrawal}
                onChange={(e) => setAge55Withdrawal(e.target.value as Age55Withdrawal)}
                className="w-full appearance-none border-b border-border bg-transparent font-serif text-lg text-foreground py-2 pr-8 focus:outline-none focus:border-foreground cursor-pointer"
              >
                {(Object.entries(age55WithdrawalLabels) as [Age55Withdrawal, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
