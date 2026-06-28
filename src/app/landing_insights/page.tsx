"use client"

import { CalculatorForm } from "@/components/calculator-form";
import { CpfForm, type Age55Withdrawal, type CpfLifePlan } from "@/components/cpf-form";
import { CpfResultsChart, type CpfChartRow } from "@/components/cpf-results-chart";
import { type ExpenseProjection } from "@/components/expense-coverage-chart";
import { HeroSection } from "@/components/hero-section";
import { ResultsChart } from "@/components/results-chart";
import { useAuth } from "@/hooks/useAuth";
import { getProfile } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import defaultInputs from "@/data/personas/default/inputs.json";
import defaultPension from "@/data/personas/default/pension-coverage.json";
import defaultRetirement from "@/data/personas/default/retirement-age.json";

const PENDING_SNAPSHOT_KEY = "fire_pending_snapshot"

type Tab = "calculator" | "cpf"

type ChartRow = { age: number; cash: number; investment: number; cpf: number };

type FineProjection = {
  yearsToRetire: number;
  monthsToRetire: number;
  daysToRetire: number;
  targetFIRE: number;
  liquidAssetDict: {
    cash: number[];
    investment: number[];
    cpf?: number[];
    total: number[];
    age: number[];
  };
};

// Derive initial form values from the persona inputs
const cashAsset = defaultInputs.assetList.find((a) => a.name === "cash");
const investmentAsset = defaultInputs.assetList.find((a) => a.name === "investment");

const defaultProjection = defaultRetirement.fineProjection.liquidAssetDict;
const initialChartData: ChartRow[] = defaultProjection.age.map((a, i) => ({
  age: a,
  cash: defaultProjection.cash[i],
  investment: defaultProjection.investment[i],
  cpf: 0,
}));

const initialCpfChartData: CpfChartRow[] = defaultPension.age.map((a, i) => ({
  age: a,
  oa: defaultPension.oa[i],
  ra: defaultPension.ra[i],
  ma: defaultPension.ma[i],
  withdrawal: defaultPension.withdrawal[i],
  expense: defaultPension.expense[i],
}));

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loginWithGoogle } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("calculator");

  // Shared state
  const [age, setAge] = useState(defaultInputs.age);
  const [ageElapsed] = useState(defaultInputs.ageElapsed);
  const [income, setIncome] = useState(defaultInputs.income);
  const [expense, setExpense] = useState(defaultInputs.expense);

  // Calculator-only state
  const [cash, setCash] = useState(cashAsset?.value ?? 30000);
  const [investment, setInvestment] = useState(investmentAsset?.value ?? 50000);
  const [investmentReturn, setInvestmentReturn] = useState(
    Math.round((investmentAsset?.return ?? 0.07) * 100 * 10) / 10,
  );

  // CPF-only state (seeded from default persona)
  const [oa, setOa] = useState(20000);
  const [sa, setSa] = useState(20000);
  const [ma, setMa] = useState(20000);
  const [cpfLifePlan, setCpfLifePlan] = useState<CpfLifePlan>("standard");
  const [cpfLifePayoutAge, setCpfLifePayoutAge] = useState(65);
  const [age55Withdrawal, setAge55Withdrawal] = useState<Age55Withdrawal>("frs_withdrawal");

  // Calculator results
  const [retirementAge, setRetirementAge] = useState<number | null>(defaultRetirement.retirementAge);
  const [yearsToRetire, setYearsToRetire] = useState<number | null>(defaultRetirement.fineProjection.yearsToRetire);
  const [monthsToRetire, setMonthsToRetire] = useState<number | null>(defaultRetirement.fineProjection.monthsToRetire);
  const [daysToRetire, setDaysToRetire] = useState<number | null>(defaultRetirement.fineProjection.daysToRetire);
  const [targetFIRE, setTargetFIRE] = useState<number | null>(defaultRetirement.fineProjection.targetFIRE);
  const [chartData, setChartData] = useState<ChartRow[]>(initialChartData);
  const [expenseProjection, setExpenseProjection] = useState<ExpenseProjection | null>(
    (defaultRetirement as { expenseProjection?: ExpenseProjection }).expenseProjection ?? null
  );
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // CPF results (CPF tab — current balances, no future contributions)
  const [expenseCoverage, setExpenseCoverage] = useState<number | null>(defaultPension.expenseCoverage);
  const [cpfChartData, setCpfChartData] = useState<CpfChartRow[]>(initialCpfChartData);
  const [cpfLoading, setCpfLoading] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  const lastResultRef = useRef<{
    retirementAge: number;
    yearsToRetire: number;
    monthsToRetire: number;
    daysToRetire: number;
    targetFIRE: number;
    fineProjection: FineProjection;
  } | null>(null);

  const isFirstCalcRender = useRef(true);
  const isFirstCpfRender = useRef(true);


  // Debounced calculator call
  useEffect(() => {
    if (isFirstCalcRender.current) {
      isFirstCalcRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setCalcLoading(true);
      setCalcError(null);
      try {
        const res = await fetch("/api/retirement-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age,
            ageElapsed,
            income,
            expense,
            assetList: [
              { name: "cash", value: cash, return: 0 },
              { name: "investment", value: investment, return: investmentReturn / 100 },
            ],
            pension: {
              oa,
              sa,
              ma,
              cpfLife: { plan: cpfLifePlan, payoutAge: cpfLifePayoutAge },
              age55Withdrawal,
            },
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`retirement-age ${res.status}: ${JSON.stringify(errBody)}`);
        }
        const result = (await res.json()) as {
          retirementAge: number;
          yearsToRetire: number;
          monthsToRetire: number;
          daysToRetire: number;
          targetFIRE: number;
          fineProjection: FineProjection;
          expenseProjection: ExpenseProjection;
        };
        setRetirementAge(result.retirementAge);
        setYearsToRetire(result.fineProjection.yearsToRetire);
        setMonthsToRetire(result.fineProjection.monthsToRetire);
        setDaysToRetire(result.fineProjection.daysToRetire);
        setTargetFIRE(result.fineProjection.targetFIRE);
        setExpenseProjection(result.expenseProjection);
        lastResultRef.current = result;
        const proj = result.fineProjection.liquidAssetDict;
        setChartData(
          proj.age.map((a, i) => ({
            age: a,
            cash: proj.cash[i],
            investment: proj.investment[i],
            cpf: proj.cpf?.[i] ?? 0,
          })),
        );
      } catch (err) {
        setCalcError("Could not reach the API. Is the backend running?");
        console.error(err);
      } finally {
        setCalcLoading(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [age, cash, investment, investmentReturn, income, expense, oa, sa, ma, cpfLifePlan, cpfLifePayoutAge, age55Withdrawal]);

  // Debounced CPF call
  useEffect(() => {
    if (isFirstCpfRender.current) {
      isFirstCpfRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setCpfLoading(true);
      setCpfError(null);
      try {
        const res = await fetch("/api/pension-coverage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age,
            ageElapsed,
            income,
            expense,
            pension: {
              oa,
              sa,
              ma,
              cpfLife: { plan: cpfLifePlan, payoutAge: cpfLifePayoutAge },
              age55Withdrawal,
            },
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`pension-coverage ${res.status}: ${JSON.stringify(errBody)}`);
        }
        const result = (await res.json()) as {
          age: number[];
          oa: number[];
          ra: number[];
          ma: number[];
          withdrawal: number[];
          expense: number[];
          expenseCoverage: number;
        };
        setExpenseCoverage(result.expenseCoverage);
        setCpfChartData(
          result.age.map((a, i) => ({
            age: a,
            oa: result.oa[i],
            ra: result.ra[i],
            ma: result.ma[i],
            withdrawal: result.withdrawal[i],
            expense: result.expense[i],
          })),
        );
      } catch (err) {
        setCpfError("Could not reach the API. Is the backend running?");
        console.error(err);
      } finally {
        setCpfLoading(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [age, ageElapsed, income, expense, oa, sa, ma, cpfLifePlan, cpfLifePayoutAge, age55Withdrawal]);

  const storePendingSnapshot = () => {
    sessionStorage.setItem(
      PENDING_SNAPSHOT_KEY,
      JSON.stringify({
        income,
        expense,
        assets: [
          { name: "cash", value: cash, return: 0 },
          { name: "investment", value: investment, return: investmentReturn / 100 },
        ],
        oa,
        sa,
        ma,
        age55Withdrawal,
        cpfLifePlan,
        cpfLifePayoutAge,
      }),
    );
  };

  const handleHeroSignIn = async (credential: string) => {
    const tokens = await loginWithGoogle(credential);
    const profile = await getProfile(tokens.access).catch(() => null);
    if (!profile?.date_of_birth) storePendingSnapshot();
    router.push(profile?.date_of_birth ? "/dashboard" : "/onboarding");
  };

  const handleSignInAndSave = async (credential: string) => {
    const tokens = await loginWithGoogle(credential);
    const profile = await getProfile(tokens.access).catch(() => null);
    if (!profile?.date_of_birth) {
      storePendingSnapshot();
      router.push("/onboarding");
      return;
    }
    router.push("/dashboard");
  };

  const tabConfig: { id: Tab; label: string }[] = [
    { id: "calculator", label: "FIRE Calculator" },
    { id: "cpf", label: "CPF Withdrawals" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 border-b border-border text-xs text-muted-foreground">
            <span suppressHydrationWarning>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>Free Financial Planning Tools</span>
          </div>
          <div className="py-6 text-center">
            <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">
              Fire Planner
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2">
              The Journal of Financial Independence
            </p>
          </div>
          <nav className="flex items-center justify-center gap-8 py-3 border-t border-border text-sm">
            <a href="#calculator" className="text-foreground hover:text-accent transition-colors">
              Calculator
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Research
            </a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
          </nav>
        </div>
      </header>

      <HeroSection
        isAuthenticated={isAuthenticated}
        onSignIn={handleHeroSignIn}
        onGoToDashboard={() => router.push("/dashboard")}
      />

      {/* Calculator Section */}
      <section
        id="calculator"
        className="scroll-mt-16 px-4 py-16 sm:px-6 lg:px-8 border-t border-border"
      >
        <div className="mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
              Interactive Analysis
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4 text-balance">
              Model Your Path to Independence
            </h2>
            <div className="w-16 h-px bg-foreground mx-auto mb-6" />
            <p className="text-muted-foreground leading-relaxed">
              Input your current financial position and assumptions.
              The projection will update in real time as you adjust parameters.
            </p>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-border mb-12">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Calculator Tab */}
          {activeTab === "calculator" && (
            <div className="grid gap-12 lg:grid-cols-[380px_1fr] items-start">
              <CalculatorForm
                age={age}
                setAge={setAge}
                cashOnHand={cash}
                setCashOnHand={setCash}
                investmentPortfolio={investment}
                setInvestmentPortfolio={setInvestment}
                portfolioReturn={investmentReturn}
                setPortfolioReturn={setInvestmentReturn}
                annualIncome={income}
                setAnnualIncome={setIncome}
                annualExpenses={expense}
                setAnnualExpenses={setExpense}
              />
              <div>
                <ResultsChart
                  retirementAge={retirementAge}
                  yearsToRetire={yearsToRetire}
                  monthsToRetire={monthsToRetire}
                  daysToRetire={daysToRetire}
                  targetFIRE={targetFIRE}
                  chartData={chartData}
                  cashOnHand={cash}
                  investmentPortfolio={investment}
                  annualExpenses={expense}
                  loading={calcLoading}
                  error={calcError}
                  expenseProjection={expenseProjection}
                  isAuthenticated={isAuthenticated}
                  onSignInAndSave={handleSignInAndSave}
                />
              </div>
            </div>
          )}

          {/* CPF Withdrawals Tab */}
          {activeTab === "cpf" && (
            <div className="grid gap-12 lg:grid-cols-[380px_1fr] items-start">
              <CpfForm
                age={age}
                setAge={setAge}
                annualExpenses={expense}
                setAnnualExpenses={setExpense}
                oa={oa}
                setOa={setOa}
                sa={sa}
                setSa={setSa}
                ma={ma}
                setMa={setMa}
                cpfLifePlan={cpfLifePlan}
                setCpfLifePlan={setCpfLifePlan}
                cpfLifePayoutAge={cpfLifePayoutAge}
                setCpfLifePayoutAge={setCpfLifePayoutAge}
                age55Withdrawal={age55Withdrawal}
                setAge55Withdrawal={setAge55Withdrawal}
              />
              <div>
                <CpfResultsChart
                  expenseCoverage={expenseCoverage}
                  chartData={cpfChartData}
                  loading={cpfLoading}
                  error={cpfError}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
            <div>
              <h3 className="font-serif text-lg text-foreground mb-3">Fire Planner</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rigorous analysis for the financially independent.
                Built on established principles of wealth accumulation.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Disclaimer</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This tool provides projections based on user inputs and is not financial advice.
                Past performance does not guarantee future results.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Links</h4>
              <div className="flex flex-col gap-2 text-sm">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Use
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Fire Planner. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
