#!/usr/bin/env node
// Dump schema (DDL) from OLD Supabase project, write as SQL to stdout

const OLD_TOKEN = 'sbp_18ab92165d6378829b205e57fa84c2105575baaf';
const OLD_REF = 'qlqnrsxpmoeoukfgovmy';

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${OLD_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OLD_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d;
}

const tables = (await q(`select table_name from information_schema.tables where table_schema='public' and table_name not in ('_migrations','households','household_members','invite_tokens') order by table_name`)).map(r => r.table_name);

let out = '-- AUTO-GENERATED schema dump from old Supabase project\n-- Tables: ' + tables.join(', ') + '\n\n';

for (const t of tables) {
  // Columns
  const cols = await q(`
    select column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, is_identity, identity_generation
    from information_schema.columns
    where table_schema='public' and table_name='${t}'
    order by ordinal_position
  `);
  // PK
  const pk = await q(`
    select kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
    where tc.table_schema='public' and tc.table_name='${t}' and tc.constraint_type='PRIMARY KEY'
    order by kcu.ordinal_position
  `);
  // Check constraints
  const checks = await q(`
    select cc.check_clause, tc.constraint_name
    from information_schema.check_constraints cc
    join information_schema.table_constraints tc on cc.constraint_name=tc.constraint_name
    where tc.table_schema='public' and tc.table_name='${t}' and tc.constraint_type='CHECK'
      and cc.check_clause not like '%IS NOT NULL%'
  `);

  const colDefs = cols.map(c => {
    let type = c.data_type;
    if (type === 'USER-DEFINED') type = c.udt_name;
    if (type === 'character varying' && c.character_maximum_length) type = `varchar(${c.character_maximum_length})`;
    if (type === 'ARRAY') type = c.udt_name.replace(/^_/, '') + '[]';
    let def = `  "${c.column_name}" ${type}`;
    if (c.is_identity === 'YES') {
      def += ` generated ${c.identity_generation || 'BY DEFAULT'} as identity`;
    } else if (c.column_default) {
      def += ` default ${c.column_default}`;
    }
    if (c.is_nullable === 'NO') def += ' not null';
    return def;
  });

  if (pk.length) {
    colDefs.push(`  primary key (${pk.map(p => `"${p.column_name}"`).join(', ')})`);
  }
  for (const c of checks) {
    colDefs.push(`  constraint "${c.constraint_name}" check (${c.check_clause})`);
  }

  out += `-- Table: ${t}\n`;
  out += `create table if not exists "${t}" (\n${colDefs.join(',\n')}\n);\n\n`;
}

// Indexes
const idx = await q(`
  select indexname, indexdef from pg_indexes
  where schemaname='public' and indexname not like '%_pkey'
  order by tablename, indexname
`);
out += '\n-- Indexes\n';
for (const i of idx) {
  out += i.indexdef.replace(/^CREATE INDEX/, 'create index if not exists').replace(/^CREATE UNIQUE INDEX/, 'create unique index if not exists') + ';\n';
}

// Sequences currval — skip, new DB starts fresh

process.stdout.write(out);
