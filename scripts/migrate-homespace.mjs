#!/usr/bin/env node
// Apply base schema + all public migrations to NEW Supabase (homespace)

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TOKEN = 'sbp_fe750bde7e291dec0877e881e11ac010173c7cb9';
const REF = 'xgsuyvuyddqhklshohjl';

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d;
}

const files = [
  '_base_schema.sql',
  ...readdirSync('supabase/migrations')
    .filter(f => f.endsWith('.sql') && !f.startsWith('_'))
    .sort(),
];

for (const f of files) {
  const sql = readFileSync(join('supabase/migrations', f), 'utf-8');
  process.stdout.write(`→ ${f} ... `);
  try {
    await q(sql);
    console.log('✓');
  } catch (e) {
    console.log('❌');
    console.error(e.message.slice(0, 500));
    process.exit(1);
  }
}
console.log('\n✅ Schema + migracje zastosowane na homespace.');
