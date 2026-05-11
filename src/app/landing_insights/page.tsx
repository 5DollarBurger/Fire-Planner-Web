"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

function computeProjection(
  age: number,
  cash: number,
  investment: number,
  investmentReturn: number,
  sellAtRetirement: boolean,
  income: number,
  expense: number,
) {
  const targetWealth = expense * 25;
  let projCash = cash;
  let projInvestment = investment;
  let retirementAge = age + 50;

  for (let y = 0; y < 50; y++) {
    if (projCash + projInvestment >= targetWealth) {
      retirementAge = age + y;
      break;
    }
    projCash += income - expense;
    projInvestment *= 1 + investmentReturn;
  }

  const yearsToRetire = Math.max(0, retirementAge - age);

  projCash = cash;
  projInvestment = investment;
  let investmentSold = false;
  const chartData: { age: number; cash: number; investment: number }[] = [];

  for (let y = 0; y <= 100 - age; y++) {
    const currentAge = age + y;
    if (currentAge < retirementAge) {
      projCash += income - expense;
      projInvestment *= 1 + investmentReturn;
    } else {
      if (sellAtRetirement && !investmentSold) {
        projCash += projInvestment;
        projInvestment = 0;
        investmentSold = true;
      }
      projCash -= expense;
    }
    const safeCash = Math.max(0, Math.round(projCash));
    const safeInvestment = Math.max(0, Math.round(projInvestment));
    chartData.push({ age: currentAge, cash: safeCash, investment: safeInvestment });
    if (safeCash === 0 && safeInvestment === 0) break;
  }

  return { retirementAge, yearsToRetire, chartData };
}

export default function LandingInsights() {
  const [age, setAge] = useState(30);
  const [cash, setCash] = useState(30000);
  const [investment, setInvestment] = useState(50000);
  const [investmentReturn, setInvestmentReturn] = useState(7);
  const [sellAtRetirement, setSellAtRetirement] = useState(true);
  const [income, setIncome] = useState(70000);
  const [expense, setExpense] = useState(40000);

  const { retirementAge, yearsToRetire, chartData } = computeProjection(
    age,
    cash,
    investment,
    investmentReturn / 100,
    sellAtRetirement,
    income,
    expense,
  );

  return (
    <div className="flex gap-8 p-8 min-h-screen">

      {/* Left column: KYC inputs */}
      <Card className="w-72 shrink-0 h-fit">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">

          <div className="flex flex-col gap-2">
            <Label htmlFor="age">Your age</Label>
            <Input
              id="age"
              type="number"
              min={16}
              max={94}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cash">Cash on hand</Label>
            <Input
              id="cash"
              type="number"
              min={0}
              step={10000}
              value={cash}
              onChange={(e) => setCash(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="investment">Investment portfolio</Label>
            <Input
              id="investment"
              type="number"
              min={0}
              step={10000}
              value={investment}
              onChange={(e) => setInvestment(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Portfolio return: {investmentReturn}%</Label>
            <Slider
              min={0}
              max={20}
              step={1}
              value={investmentReturn}
              onValueChange={(val) => setInvestmentReturn(val as number)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="sell"
              checked={sellAtRetirement}
              onCheckedChange={setSellAtRetirement}
            />
            <Label htmlFor="sell">Sell investments at retirement</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="income">Annual income</Label>
            <Input
              id="income"
              type="number"
              min={0}
              step={10000}
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expense">Annual expenses</Label>
            <Input
              id="expense"
              type="number"
              min={0}
              step={10000}
              value={expense}
              onChange={(e) => setExpense(Number(e.target.value))}
            />
          </div>

        </CardContent>
      </Card>

      {/* Right column: insights */}
      <div className="flex-1 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Landing Insights</h1>

        <p className="text-lg">
          You can retire in <strong>{yearsToRetire} years</strong> at{" "}
          <strong>{retirementAge} years old</strong>.
        </p>

        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="age"
              label={{ value: "Age (years)", position: "insideBottom", offset: -5 }}
            />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="cash" stackId="a" fill="#60a5fa" name="Cash" />
            <Bar dataKey="investment" stackId="a" fill="#34d399" name="Investment" />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
