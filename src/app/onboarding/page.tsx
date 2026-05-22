"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { computeAgeFromDOB, createSnapshot, updateProfile } from "@/lib/api"

const PENDING_SNAPSHOT_KEY = "fire_pending_snapshot"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function OnboardingPage() {
  const router = useRouter()
  const { isAuthenticated, accessToken } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  const [dob, setDob] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/landing_insights")
    }
  }, [hydrated, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setError(null)
    setSaving(true)
    try {
      await updateProfile({ date_of_birth: dob }, accessToken)
      const pending = sessionStorage.getItem(PENDING_SNAPSHOT_KEY)
      if (pending) {
        try {
          const { age, ageElapsed } = computeAgeFromDOB(dob)
          await createSnapshot({ ...JSON.parse(pending), age, age_elapsed: ageElapsed }, accessToken)
        } catch { /* don't block navigation if snapshot save fails */ }
        sessionStorage.removeItem(PENDING_SNAPSHOT_KEY)
      }
      router.replace("/dashboard")
    } catch {
      setError("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!hydrated || !isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl text-foreground tracking-tight mb-2">
            Fire Planner
          </h1>
          <div className="w-12 h-px bg-foreground mx-auto mb-6" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            One more thing
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-8">
            <h2 className="font-serif text-xl text-foreground mb-2">
              When were you born?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Your date of birth lets us calculate your precise age and project
              your FIRE date accurately.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full font-serif text-lg border-0 border-b border-border bg-transparent pb-2 focus:outline-none focus:border-foreground transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={!dob || saving}
                className="w-full text-sm border border-border px-4 py-2.5 hover:border-foreground transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Continue to Dashboard"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
