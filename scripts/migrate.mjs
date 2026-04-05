#!/usr/bin/env node
// scripts/migrate.mjs
// Uruchom: node scripts/migrate.mjs
// Wymaga SUPABASE_DB_PASSWORD w .env.local lub środowisku

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

// Wczytaj .env.local
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
const DB_PASS = process.env.SUPABASE_DB_PASSWORD
const DB_URL = `postgresql://postgres.${PROJECT_REF}:${DB_PASS}@aws-0-eu-north-1.pooler.supabase.com:6543/postgres`

if (!DB_PASS) {
  console.error('❌ Brak SUPABASE_DB_PASSWORD w .env.local')
  console.error('   Dodaj hasło do bazy (to samo co w GitHub Secrets SUPABASE_DB_PASSWORD)')
  process.exit(1)
}

const migrationsDir = 'supabase/migrations'
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()

if (!files.length) {
  console.log('Brak plików .sql w', migrationsDir)
  process.exit(0)
}

console.log(`Znaleziono ${files.length} plików migracji\n`)

for (const file of files) {
  const sqlPath = join(migrationsDir, file).replace(/\\/g, '/')
  process.stdout.write(`→ ${file} ... `)

  try {
    execSync(`psql "${DB_URL}" -f "${sqlPath}"`, {
      env: { ...process.env, PGPASSWORD: DB_PASS },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    console.log('✓')
  } catch (err) {
    console.log('❌')
    console.error(err.stderr?.toString() || err.message)
    process.exit(1)
  }
}

console.log('\n✅ Wszystkie migracje wykonane.')
