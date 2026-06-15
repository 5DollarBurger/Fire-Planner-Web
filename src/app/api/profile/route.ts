import { NextRequest, NextResponse } from "next/server"

const DJANGO = process.env.API_URL!
const KEY = process.env.API_KEY!

function djangoHeaders(auth: string) {
  return { "Content-Type": "application/json", "X-API-Key": KEY, Authorization: auth }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? ""
  const res = await fetch(`${DJANGO}/profile/`, { headers: djangoHeaders(auth) })
  const data = await res.json().catch(() => ({ detail: "Upstream error" }))
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? ""
  const body = await req.text()
  const res = await fetch(`${DJANGO}/profile/`, {
    method: "PUT",
    headers: djangoHeaders(auth),
    body,
  })
  const data = await res.json().catch(() => ({ detail: "Upstream error" }))
  return NextResponse.json(data, { status: res.status })
}
