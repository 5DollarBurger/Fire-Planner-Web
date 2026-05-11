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
      <div className="w-72 shrink-0">
        <p>Age: {age}</p>
        <p>Retirement age: {retirementAge}</p>
        <p>Years to retire: {yearsToRetire}</p>
        <p>Chart data rows: {chartData.length}</p>
      </div>
      <div className="flex-1">
        <p>Chart goes here</p>
      </div>
    </div>
  );
}
