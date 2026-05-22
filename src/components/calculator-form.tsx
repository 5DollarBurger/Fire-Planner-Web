"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
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

interface CalculatorFormProps {
  age: number
  setAge: (value: number) => void
  cashOnHand: number
  setCashOnHand: (value: number) => void
  investmentPortfolio: number
  setInvestmentPortfolio: (value: number) => void
  portfolioReturn: number
  setPortfolioReturn: (value: number) => void
  sellAtRetirement: boolean
  setSellAtRetirement: (value: boolean) => void
  annualIncome: number
  setAnnualIncome: (value: number) => void
  annualExpenses: number
  setAnnualExpenses: (value: number) => void
}

export function CalculatorForm({
  age,
  setAge,
  cashOnHand,
  setCashOnHand,
  investmentPortfolio,
  setInvestmentPortfolio,
  portfolioReturn,
  setPortfolioReturn,
  sellAtRetirement,
  setSellAtRetirement,
  annualIncome,
  setAnnualIncome,
  annualExpenses,
  setAnnualExpenses,
}: CalculatorFormProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const parseCurrency = (value: string) => {
    const number = parseInt(value.replace(/[^0-9]/g, ""), 10)
    return isNaN(number) ? 0 : number
  }

  const savingsRate = annualIncome > 0 
    ? Math.round(((annualIncome - annualExpenses) / annualIncome) * 100)
    : 0

  return (
    <Card className="lg:sticky lg:top-24 border-border bg-card">
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-serif text-xl text-foreground">Your Financial Position</h2>
          {/* <p className="text-sm text-muted-foreground mt-1">All figures in USD</p> */}
        </div>

        <div className="p-6 space-y-6">
          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age" className="text-xs uppercase tracking-wider text-muted-foreground">
              Current Age
            </Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 0)}
              min={18}
              max={100}
              className="font-serif text-lg border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          {/* Annual Income */}
          <div className="space-y-2">
            <Label htmlFor="income" className="text-xs uppercase tracking-wider text-muted-foreground">
              Annual Income
            </Label>
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="income"
                type="text"
                value={formatCurrency(annualIncome)}
                onChange={(e) => setAnnualIncome(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={annualIncome} onChange={setAnnualIncome} />
            </div>
          </div>

          {/* Annual Expenses */}
          <div className="space-y-2">
            <Label htmlFor="expenses" className="text-xs uppercase tracking-wider text-muted-foreground">
              Annual Expenses
            </Label>
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="expenses"
                type="text"
                value={formatCurrency(annualExpenses)}
                onChange={(e) => setAnnualExpenses(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={annualExpenses} onChange={setAnnualExpenses} />
            </div>
          </div>

          {/* Savings Rate */}
          <div className="border border-border p-4 bg-secondary/30">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Savings Rate</span>
              <span className="font-serif text-2xl text-foreground">
                {savingsRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {savingsRate >= 50 ? "Exceptional" : savingsRate >= 30 ? "Strong" : savingsRate >= 15 ? "Moderate" : "Consider reducing expenses"}
            </p>
          </div>

          {/* Cash on Hand */}
          <div className="space-y-2">
            <Label htmlFor="cash" className="text-xs uppercase tracking-wider text-muted-foreground">
              Cash Holdings
            </Label>
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="cash"
                type="text"
                value={formatCurrency(cashOnHand)}
                onChange={(e) => setCashOnHand(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={cashOnHand} onChange={setCashOnHand} />
            </div>
          </div>

          {/* Investment Portfolio */}
          <div className="space-y-2">
            <Label htmlFor="portfolio" className="text-xs uppercase tracking-wider text-muted-foreground">
              Investment Portfolio
            </Label>
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <Input
                id="portfolio"
                type="text"
                value={formatCurrency(investmentPortfolio)}
                onChange={(e) => setInvestmentPortfolio(parseCurrency(e.target.value))}
                className="flex-1 font-serif text-lg border-0 rounded-none bg-transparent px-0 focus-visible:ring-0"
              />
              <Stepper value={investmentPortfolio} onChange={setInvestmentPortfolio} />
            </div>
          </div>

          {/* Portfolio Return Slider */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Expected Return
              </Label>
              <span className="font-serif text-lg text-foreground">
                {portfolioReturn}%
              </span>
            </div>
            <Slider
              value={portfolioReturn}
              onValueChange={(value) => setPortfolioReturn(value as number)}
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

          {/* Sell at Retirement Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="sell-toggle" className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                Withdrawal Strategy
              </Label>
              <p className="text-sm text-foreground">
                {sellAtRetirement ? "Cash out at retirement" : "Live off returns only"}
              </p>
            </div>
            <Switch
              id="sell-toggle"
              checked={sellAtRetirement}
              onCheckedChange={setSellAtRetirement}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
