"use client"

import { ArrowDown } from "lucide-react"

export function HeroSection() {
  const scrollToCalculator = () => {
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 md:py-24">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border" />
      
      {/* Masthead style header */}
      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
          Financial Independence Planning
        </p>
        <div className="w-24 h-px bg-foreground mx-auto" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-8 text-balance leading-[1.1]">
          When will you achieve
          <br />
          <span className="italic">financial independence?</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-sans">
          The definitive calculator for serious investors planning their path to early retirement. 
          Project your wealth accumulation with institutional-grade precision.
        </p>

        <button
          onClick={scrollToCalculator}
          className="group inline-flex items-center gap-3 text-sm tracking-wide uppercase text-foreground hover:text-accent transition-colors"
        >
          <span className="border-b border-foreground pb-0.5 group-hover:border-accent">
            Begin Your Analysis
          </span>
          <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
        </button>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-muted-foreground tracking-wide">
        <span>Est. 2024</span>
        <span className="w-1 h-1 bg-muted-foreground rounded-full" />
        <span>Trusted Analysis</span>
        <span className="w-1 h-1 bg-muted-foreground rounded-full" />
        <span>No Cost</span>
      </div>
    </section>
  )
}
