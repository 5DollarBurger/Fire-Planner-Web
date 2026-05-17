import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const REPO_BASE = "https://raw.githubusercontent.com/5DollarBurger/FIRE-Planner/main/personas"
const PERSONAS = ["default"]
const FILES = ["inputs.json", "retirement-age.json", "projection.json"]

const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) {
  throw new Error(
    "GITHUB_TOKEN env var is required. Set it in .env.local (local) or Vercel env vars (deploy)."
  )
}
const headers = { Authorization: `token ${TOKEN}` }

const outRoot = join(process.cwd(), "src/data/personas")

for (const persona of PERSONAS) {
  const personaDir = join(outRoot, persona)
  await mkdir(personaDir, { recursive: true })

  for (const file of FILES) {
    const url = `${REPO_BASE}/${persona}/${file}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
    }
    const text = await res.text()
    await writeFile(join(personaDir, file), text)
    console.log(`✓ ${persona}/${file}`)
  }
}
