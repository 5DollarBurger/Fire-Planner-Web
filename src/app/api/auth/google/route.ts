import { NextRequest, NextResponse } from "next/server"

const DJANGO = process.env.API_URL!
const KEY = process.env.API_KEY!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${DJANGO}/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": KEY },
    body,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
