import { NextRequest, NextResponse } from "next/server"

const DJANGO = process.env.API_URL ?? "http://127.0.0.1:8000"
const KEY = process.env.API_KEY ?? ""

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get("Authorization") ?? ""
    const body = await req.text()
    const res = await fetch(`${DJANGO}/snapshots/${id}/compare/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": KEY, Authorization: auth },
      body,
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: "Service unavailable." }, { status: 503 })
  }
}
