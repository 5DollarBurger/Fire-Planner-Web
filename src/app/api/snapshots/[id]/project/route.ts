import { NextRequest, NextResponse } from "next/server"

const DJANGO = process.env.API_URL ?? "http://127.0.0.1:8000"
const KEY = process.env.API_KEY ?? ""

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get("Authorization") ?? ""
    const res = await fetch(`${DJANGO}/snapshots/${id}/project/`, {
      headers: { "X-API-Key": KEY, Authorization: auth },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: "Service unavailable." }, { status: 503 })
  }
}
