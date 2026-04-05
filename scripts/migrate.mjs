#!/usr/bin/env node
// scripts/migrate.mjs
// Uruchom lokalnie: node scripts/migrate.mjs
// W GitHub Actions: SUPABASE_ACCESS_TOKEN w Secrets

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// Wczytaj .env.local (lokalnie)
try {
  const env = readFileSync('.env.local', 'utf-8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch {}

const PROJECT_REF = 'qlqnrsxpmoeoukfgovmy'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!TOKEN) {
  console.error('❌ Brak SUPABASE_ACCESS_TOKEN w .env.local lub środowisku')
  process.exit(1)
}

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

// Utwórz tabelę śledzącą migracje (idempotentne)
await query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  )
`)

// Pobierz już zastosowane migracje
const applied = await query('SELECT filename FROM _migrations')
const appliedSet = new Set((applied || []).map(r => r.filename))

const files = readdirSync('supabase/migrations')
  .filter(f => f.endsWith('.sql'))
  .sort()

if (!files.length) {
  console.log('Brak plików SQL w supabase/migrations/')
  process.exit(0)
}

console.log(`Znaleziono ${files.length} plików migracji\n`)

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`→ ${file} ... ✓ (już zastosowana)`)
    continue
  }

  const sql = readFileSync(join('supabase/migrations', file), 'utf-8')
  process.stdout.write(`→ ${file} ... `)

  try {
    await query(sql)
    await query(`INSERT INTO _migrations (filename) VALUES ('${file}')`)
    console.log('✓ (nowa)')
  } catch (e) {
    console.log('❌')
    console.error('Błąd:', e.message)
    process.exit(1)
  }
}

console.log('\n✅ Migracje wykonane.')
