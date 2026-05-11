import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000"
const API_KEY = process.env.API_KEY ?? ""

export async function POST(request: NextRequest) {
  const body = await request.json()

  const response = await fetch(`${API_URL}/retirementage/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.status })
}
