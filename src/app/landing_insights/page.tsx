"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type ChartRow = { age: number; cash: number; investment: number };

export default function LandingInsights() {
  const [age, setAge] = useState(30);
  const [cash, setCash] = useState(30000);
  const [investment, setInvestment] = useState(50000);
  const [investmentReturn, setInvestmentReturn] = useState(7);
  const [sellAtRetirement, setSellAtRetirement] = useState(true);
  const [income, setIncome] = useState(70000);
  const [expense, setExpense] = useState(40000);

  const [retirementAge, setRetirementAge] = useState<number | null>(null);
  const [yearsToRetire, setYearsToRetire] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const customerPayload = {
        age,
        income,
        expense,
        sellInvestmentAtRetirement: sellAtRetirement,
        assetList: [
          { name: "cash", value: cash, return: 0 },
          { name: "investment", value: investment, return: investmentReturn / 100 },
        ],
      };

      try {
        const retirementResult = await api.calculateRetirementAge(customerPayload);

        const projectionResult = await api.projectLiquidAsset({
          ...customerPayload,
          retirementAge: retirementResult.retirementAge,
        });

        setRetirementAge(retirementResult.retirementAge);
        setYearsToRetire(retirementResult.yearsToRetire);
        setChartData(
          projectionResult.age.map((a, i) => ({
            age: a,
            cash: projectionResult.cash[i],
            investment: projectionResult.investment[i],
          })),
        );
      } catch (err: unknown) {
        setError("Could not reach the API. Is the backend running?");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [age, cash, investment, investmentReturn, sellAtRetirement, income, expense]);

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

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {!error && retirementAge !== null && yearsToRetire !== null && (
          <p className="text-lg">
            You can retire in <strong>{yearsToRetire} years</strong> at{" "}
            <strong>{retirementAge} years old</strong>.
          </p>
        )}

        {loading && <p className="text-sm text-muted-foreground">Calculating...</p>}

        {chartData.length > 0 && (
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
        )}
      </div>

    </div>
  );
}
