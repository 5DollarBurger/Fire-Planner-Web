import { NextRequest, NextResponse } from "next/server"

const DJANGO = process.env.API_URL!
const KEY = process.env.API_KEY!

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? ""
  const res = await fetch(`${DJANGO}/snapshots/`, {
    headers: { "X-API-Key": KEY, Authorization: auth },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? ""
  const body = await req.text()
  const res = await fetch(`${DJANGO}/snapshots/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": KEY, Authorization: auth },
    body,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
