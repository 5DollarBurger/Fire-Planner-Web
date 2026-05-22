"use client"

import { CalculatorForm } from "@/components/calculator-form";
import { HeroSection } from "@/components/hero-section";
import { ResultsChart } from "@/components/results-chart";
import { useAuth } from "@/hooks/useAuth";
import { computeAgeFromDOB, createSnapshot, getProfile } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import defaultInputs from "@/data/personas/default/inputs.json";
import defaultRetirement from "@/data/personas/default/retirement-age.json";

const PENDING_SNAPSHOT_KEY = "fire_pending_snapshot"

type ChartRow = { age: number; cash: number; investment: number };

type FineProjection = {
  yearsToRetire: number;
  monthsToRetire: number;
  daysToRetire: number;
  targetFIRE: number;
  liquidAssetDict: {
    cash: number[];
    investment: number[];
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
}));

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, loginWithGoogle } = useAuth();

  // Calculator state — seeded from the default persona
  const [age, setAge] = useState(defaultInputs.age);
  const [ageElapsed, setAgeElapsed] = useState(defaultInputs.ageElapsed);
  const [cash, setCash] = useState(cashAsset?.value ?? 30000);
  const [investment, setInvestment] = useState(investmentAsset?.value ?? 50000);
  const [investmentReturn, setInvestmentReturn] = useState(
    Math.round((investmentAsset?.return ?? 0.07) * 100 * 10) / 10,
  );
  const [sellAtRetirement, setSellAtRetirement] = useState(defaultInputs.sellInvestmentAtRetirement);
  const [income, setIncome] = useState(defaultInputs.income);
  const [expense, setExpense] = useState(defaultInputs.expense);

  // Results — seeded from the precomputed persona responses
  const [retirementAge, setRetirementAge] = useState<number | null>(defaultRetirement.retirementAge);
  const [yearsToRetire, setYearsToRetire] = useState<number | null>(defaultRetirement.fineProjection.yearsToRetire);
  const [monthsToRetire, setMonthsToRetire] = useState<number | null>(defaultRetirement.fineProjection.monthsToRetire);
  const [daysToRetire, setDaysToRetire] = useState<number | null>(defaultRetirement.fineProjection.daysToRetire);
  const [targetFIRE, setTargetFIRE] = useState<number | null>(defaultRetirement.fineProjection.targetFIRE);
  const [chartData, setChartData] = useState<ChartRow[]>(initialChartData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last computed result so we can save it when the user signs in
  const lastResultRef = useRef<{
    retirementAge: number;
    yearsToRetire: number;
    monthsToRetire: number;
    daysToRetire: number;
    targetFIRE: number;
    fineProjection: FineProjection;
  } | null>(null);

  // Skip the first useEffect run — initial state already reflects the default persona
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const customerPayload = {
        age,
        ageElapsed,
        income,
        expense,
        sellInvestmentAtRetirement: sellAtRetirement,
        assetList: [
          { name: "cash", value: cash, return: 0 },
          { name: "investment", value: investment, return: investmentReturn / 100 },
        ],
      };

      try {
        const retirementRes = await fetch("/api/retirement-age", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customerPayload),
        });
        if (!retirementRes.ok) {
          const errBody = await retirementRes.json().catch(() => ({}));
          throw new Error(`retirement-age ${retirementRes.status}: ${JSON.stringify(errBody)}`);
        }
        const retirementResult = (await retirementRes.json()) as {
          retirementAge: number;
          yearsToRetire: number;
          monthsToRetire: number;
          daysToRetire: number;
          targetFIRE: number;
          fineProjection: FineProjection;
        };

        setRetirementAge(retirementResult.retirementAge);
        setYearsToRetire(retirementResult.fineProjection.yearsToRetire);
        setMonthsToRetire(retirementResult.fineProjection.monthsToRetire);
        setDaysToRetire(retirementResult.fineProjection.daysToRetire);
        setTargetFIRE(retirementResult.fineProjection.targetFIRE);
        lastResultRef.current = retirementResult;

        const proj = retirementResult.fineProjection.liquidAssetDict;
        setChartData(
          proj.age.map((a, i) => ({
            age: a,
            cash: proj.cash[i],
            investment: proj.investment[i],
          })),
        );
      } catch (err: unknown) {
        setError("Could not reach the API. Is the backend running?");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [age, cash, investment, investmentReturn, sellAtRetirement, income, expense]);

  const storePendingSnapshot = () => {
    const result = lastResultRef.current
    if (!result) return
    const proj = result.fineProjection.liquidAssetDict
    sessionStorage.setItem(
      PENDING_SNAPSHOT_KEY,
      JSON.stringify({
        income,
        expense,
        assets: [
          { name: "cash", value: cash, return: 0 },
          { name: "investment", value: investment, return: investmentReturn / 100 },
        ],
        sell_at_retirement: sellAtRetirement,
        retirement_age: result.retirementAge,
        years_to_retire: result.fineProjection.yearsToRetire,
        months_to_retire: result.fineProjection.monthsToRetire,
        days_to_retire: result.fineProjection.daysToRetire,
        target_fire: result.fineProjection.targetFIRE,
        projection: { cash: proj.cash, investment: proj.investment, age: proj.age },
      }),
    )
  }

  const handleHeroSignIn = async (credential: string) => {
    const tokens = await loginWithGoogle(credential);
    const profile = await getProfile(tokens.access).catch(() => null);
    if (!profile?.date_of_birth) storePendingSnapshot()
    router.push(profile?.date_of_birth ? "/dashboard" : "/onboarding");
  };

  const handleSignInAndSave = async (credential: string) => {
    const tokens = await loginWithGoogle(credential);
    const profile = await getProfile(tokens.access).catch(() => null);

    if (!profile?.date_of_birth) {
      storePendingSnapshot()
      router.push("/onboarding");
      return;
    }

    const result = lastResultRef.current;
    if (result) {
      const { age: dobAge, ageElapsed } = computeAgeFromDOB(profile.date_of_birth);
      const proj = result.fineProjection.liquidAssetDict;
      await createSnapshot(
        {
          age: dobAge,
          age_elapsed: ageElapsed,
          income,
          expense,
          assets: [
            { name: "cash", value: cash, return: 0 },
            { name: "investment", value: investment, return: investmentReturn / 100 },
          ],
          sell_at_retirement: sellAtRetirement,
          retirement_age: result.retirementAge,
          years_to_retire: result.fineProjection.yearsToRetire,
          months_to_retire: result.fineProjection.monthsToRetire,
          days_to_retire: result.fineProjection.daysToRetire,
          target_fire: result.fineProjection.targetFIRE,
          projection: { cash: proj.cash, investment: proj.investment, age: proj.age },
        },
        tokens.access,
      ).catch(console.error);
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen">
      {/* Header - Masthead Style */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between py-2 border-b border-border text-xs text-muted-foreground">
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>Free Financial Planning Tools</span>
          </div>
          {/* Main header */}
          <div className="py-6 text-center">
            <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">
              Fire Planner
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2">
              The Journal of Financial Independence
            </p>
          </div>
          {/* Navigation */}
          <nav className="flex items-center justify-center gap-8 py-3 border-t border-border text-sm">
            <a
              href="#calculator"
              className="text-foreground hover:text-accent transition-colors"
            >
              Calculator
            </a>
            <span className="text-border">|</span>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Methodology
            </a>
            <span className="text-border">|</span>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Research
            </a>
            <span className="text-border">|</span>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
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
          <div className="mb-12 text-center max-w-2xl mx-auto">
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

          {/* Two Column Layout */}
          <div className="grid gap-12 lg:grid-cols-[380px_1fr] items-start">
            {/* Left: Sticky Form */}
            <CalculatorForm
                age={age}
                setAge={setAge}
                cashOnHand={cash}
                setCashOnHand={setCash}
                investmentPortfolio={investment}
                setInvestmentPortfolio={setInvestment}
                portfolioReturn={investmentReturn}
                setPortfolioReturn={setInvestmentReturn}
                sellAtRetirement={sellAtRetirement}
                setSellAtRetirement={setSellAtRetirement}
                annualIncome={income}
                setAnnualIncome={setIncome}
                annualExpenses={expense}
                setAnnualExpenses={setExpense}
              />

            {/* Right: Results */}
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
                sellAtRetirement={sellAtRetirement}
                loading={loading}
                error={error}
                isAuthenticated={isAuthenticated}
                onSignInAndSave={handleSignInAndSave}
              />
            </div>
          </div>
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
  )
}
