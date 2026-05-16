"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

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
    <Card className="sticky top-24 border-border bg-card">
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-serif text-xl text-foreground">Your Financial Position</h2>
          <p className="text-sm text-muted-foreground mt-1">All figures in USD</p>
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

          {/* Cash on Hand */}
          <div className="space-y-2">
            <Label htmlFor="cash" className="text-xs uppercase tracking-wider text-muted-foreground">
              Cash Holdings
            </Label>
            <Input
              id="cash"
              type="text"
              value={formatCurrency(cashOnHand)}
              onChange={(e) => setCashOnHand(parseCurrency(e.target.value))}
              className="font-serif text-lg border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          {/* Investment Portfolio */}
          <div className="space-y-2">
            <Label htmlFor="portfolio" className="text-xs uppercase tracking-wider text-muted-foreground">
              Investment Portfolio
            </Label>
            <Input
              id="portfolio"
              type="text"
              value={formatCurrency(investmentPortfolio)}
              onChange={(e) => setInvestmentPortfolio(parseCurrency(e.target.value))}
              className="font-serif text-lg border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />
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
              <span>Historic avg: 7%</span>
              <span>20%</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Sell at Retirement Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="sell-toggle" className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                Withdrawal Strategy
              </Label>
              <p className="text-sm text-foreground">
                {sellAtRetirement ? "Draw down principal" : "Live off returns only"}
              </p>
            </div>
            <Switch
              id="sell-toggle"
              checked={sellAtRetirement}
              onCheckedChange={setSellAtRetirement}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Annual Income */}
          <div className="space-y-2">
            <Label htmlFor="income" className="text-xs uppercase tracking-wider text-muted-foreground">
              Annual Income
            </Label>
            <Input
              id="income"
              type="text"
              value={formatCurrency(annualIncome)}
              onChange={(e) => setAnnualIncome(parseCurrency(e.target.value))}
              className="font-serif text-lg border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />
          </div>

          {/* Annual Expenses */}
          <div className="space-y-2">
            <Label htmlFor="expenses" className="text-xs uppercase tracking-wider text-muted-foreground">
              Annual Expenses
            </Label>
            <Input
              id="expenses"
              type="text"
              value={formatCurrency(annualExpenses)}
              onChange={(e) => setAnnualExpenses(parseCurrency(e.target.value))}
              className="font-serif text-lg border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />
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
        </div>
      </CardContent>
    </Card>
  )
}
