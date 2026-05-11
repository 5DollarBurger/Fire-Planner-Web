"use client";

import { useState } from "react";

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
    chartData.push({
      age: currentAge,
      cash: safeCash,
      investment: safeInvestment,
    });
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
      <div className="w-72 shrink-0 flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Your Profile</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Your Age</label>
          <input
            type="number"
            min={16}
            max={94}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Cash on hand</label>
          <input
            type="number"
            min={0}
            step={10000}
            value={cash}
            onChange={(e) => setCash(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Investment portfolio</label>
          <input
            type="number"
            min={0}
            step={10000}
            value={investment}
            onChange={(e) => setInvestment(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Portfolio return: {investmentReturn}%
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={investmentReturn}
            onChange={(e) => setInvestmentReturn(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sell"
            checked={sellAtRetirement}
            onChange={(e) => setSellAtRetirement(e.target.checked)}
          />
          <label
            htmlFor="sell"
            className="text-sm
  font-medium"
          >
            Sell investments at retirement
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Annual income</label>
          <input
            type="number"
            min={0}
            step={10000}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Annual expenses</label>
          <input
            type="number"
            min={0}
            step={10000}
            value={expense}
            onChange={(e) => setExpense(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Right column: placeholder */}
      <div className="flex-1">
        <p>Retirement age: {retirementAge}</p>
        <p>Years to retire: {yearsToRetire}</p>
      </div>
    </div>
  );
}
