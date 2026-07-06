import { NextRequest, NextResponse } from "next/server"

const DJANGO = process.env.API_URL ?? "http://127.0.0.1:8000"
const KEY = process.env.API_KEY ?? ""

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(`${DJANGO}/auth/google/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": KEY },
      body,
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: "Auth service unavailable." }, { status: 503 })
  }
}
