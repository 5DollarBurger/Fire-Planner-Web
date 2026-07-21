"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { createSnapshot, isApiError, updateProfile } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const PENDING_SNAPSHOT_KEY = "fire_pending_snapshot"

export default function OnboardingPage() {
  const router = useRouter()
  const { isAuthenticated, accessToken, authFetch } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState<"male" | "female">("female")
  const [country, setCountry] = useState("SGP")
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
      await authFetch((token) => updateProfile({ date_of_birth: dob, gender, country }, token))
      const pending = sessionStorage.getItem(PENDING_SNAPSHOT_KEY)
      if (pending) {
        try {
          await authFetch((token) => createSnapshot(JSON.parse(pending), token))
        } catch { /* don't block navigation if snapshot save fails */ }
        sessionStorage.removeItem(PENDING_SNAPSHOT_KEY)
      }
      router.replace("/dashboard")
    } catch (err) {
      // A 401 means authFetch already tried to refresh, failed, and has
      // already logged out + toasted + redirected — don't flash a second,
      // redundant inline error right before the user is navigated away.
      if (!isApiError(err) || err.status !== 401) {
        setError("Failed to save. Please try again.")
      }
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
              Tell us about yourself
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Your date of birth, country, and gender let us personalise your
              projection — accounting for local inflation, life expectancy, and
              pension eligibility.
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

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Gender
                </label>
                <div className="flex gap-6 pb-2 border-b border-border">
                  {(["female", "male"] as const).map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer text-sm font-serif">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={gender === g}
                        onChange={() => setGender(g)}
                        className="accent-foreground"
                      />
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Country of Residence
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full font-serif text-lg border-0 border-b border-border bg-transparent pb-2 focus:outline-none focus:border-foreground
              transition-colors"
                >
                  <option value="SGP">Singapore</option>
                  {/* <option value="USA">United States</option> */}
                  {/* <option value="GBR">United Kingdom</option> */}
                  <option value="AUS">Australia</option>
                  {/* <option value="CAN">Canada</option>
                  <option value="MYS">Malaysia</option>
                  <option value="HKG">Hong Kong</option>
                  <option value="NZL">New Zealand</option> */}
                  {/* {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))} */}
                </select>
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
