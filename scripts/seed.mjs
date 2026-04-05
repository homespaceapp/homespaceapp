#!/usr/bin/env node
// scripts/seed.mjs — jednorazowe załadowanie danych do Supabase
// Uruchom: node scripts/seed.mjs

import { readFileSync } from 'fs'

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
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!TOKEN) {
  console.error('❌ Brak SUPABASE_ACCESS_TOKEN w .env.local')
  process.exit(1)
}

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

console.log('🌱 Seed Loszki App → Supabase\n')

// 1. Dodaj brakujące kolumny w meals
console.log('→ Dodaję kolumny category + protein_per_serving do meals...')
await sql(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meals' AND column_name='category') THEN
      ALTER TABLE meals ADD COLUMN category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meals' AND column_name='protein_per_serving') THEN
      ALTER TABLE meals ADD COLUMN protein_per_serving INTEGER;
    END IF;
  END $$;
`)
console.log('  ✓')

// 2. Wyczyść jeśli coś jest
console.log('→ Czyszczę istniejące dane...')
await sql(`TRUNCATE meals, weekly_plan, bills RESTART IDENTITY CASCADE`)
console.log('  ✓')

// 3. Wstaw 34 oryginalne dania
console.log('→ Wstawiam 34 dania...')
await sql(`
INSERT INTO meals (name, category, prep_time, protein_per_serving, protein_rating, notes) VALUES
('Kurczak w sosie + ryż','kurczak',30,93,'hi','Ugotuj 600g filetu, zostaje 400g na D+2'),
('Makaron carbonara','makaron',15,38,'ok','Boczek + jajka'),
('Sałatka z kurczakiem','kurczak',10,62,'md','Użyj ugotowanego kurczaka z poprzedniego dnia'),
('Spaghetti bolognese','makaron',25,54,'md','Mięso mielone rozmroź wieczór wcześniej'),
('Jajko sadzone + ziemniaki + surówka','jajka',20,24,'lo',null),
('Kasza z kiełbasą i ogórkami','kasza',20,48,'ok',null),
('Naleśniki (Nutella/dżem/ser biały)','slodkie',20,18,'lo','Niedziela słodka'),
('Udka z kurczaka z piekarnika + surówka','kurczak',50,108,'hi','Piecz wszystkie naraz, reszta na kebab D+2'),
('Makaron z pieczarkami w śmietanie','makaron',20,22,'lo','Dodaj shake białkowy'),
('Kebab domowy','kurczak',10,72,'md','Mięso z udek pieczonych'),
('Karkówka z patelni z cebulą + kasza','wieprzowina',25,66,'md','Użyj 400g, zostaje na tortille D+1'),
('Tortille z karkówką','wieprzowina',10,44,'ok','Resztki karkówki'),
('Szakszuka','jajka',15,28,'lo','Jajka + passata + cebula'),
('Racuchy / Gofry','slodkie',20,20,'lo','Niedziela słodka'),
('Kurczak kotlet + ziemniaki + sałatka','kurczak',30,93,'hi','500g filetu, zostaje na gyros D+2'),
('Smażony ryż z jajkiem i warzywami','jajka',15,32,'ok','Ryż ugotowany poprzedniego dnia'),
('Gyros domowy z piekarnika','kurczak',45,78,'md','Reszta kurczaka + tortille'),
('Domowe burgerki','wieprzowina',20,54,'md','Mięso mielone rozmrożone'),
('Jajko na twardo w sosie koperkowym + ziemniaki','jajka',20,24,'lo',null),
('Makaron penne arrabiata','makaron',20,18,'lo','Passata + czosnek + chili'),
('Omlety / pancakes białkowe','slodkie',15,38,'ok','Niedziela słodka - białkowe!'),
('Świinka duszona + kasza gryczana','wieprzowina',90,66,'md','90 min pasywnie'),
('Kurczak w papryce (paprykarz) + ryż','kurczak',30,78,'md','Zostaje na curry D+2'),
('Tortille ze świinką','wieprzowina',10,44,'ok','Resztki świinki duszonej'),
('Curry z kurczakiem i ryżem','kurczak',30,78,'md','Reszta kurczaka z paprykarz D-2'),
('Zupa pomidorowa z makaronem','makaron',20,18,'lo','Passata + bulion'),
('Kotlet schabowy (mielony) + ziemniaki + surówka','wieprzowina',25,54,'md',null),
('Placki ziemniaczane + śmietana','ziemniaki',25,14,'lo','Resztki ziemniaków'),
('Pizza na tortilli','szybkie',10,28,'lo','Tortille + passata + ser'),
('Ryż z jabłkami i cynamonem','slodkie',20,14,'lo','Niedziela słodka'),
('Bitki wieprzowe w sosie + ziemniaki','wieprzowina',40,66,'md',null),
('Kurczak teriyaki + ryż','kurczak',25,78,'md','Sos teriyaki: soja + miód + czosnek'),
('Kopytka z masłem i serem','ziemniaki',30,16,'lo','Dodaj shake'),
('Kasza z sosem grzybowym','kasza',25,18,'lo','Suszone grzyby + śmietana')
`)
console.log('  ✓ 34 dania')

// 4. Wstaw 22 nowe dania
console.log('→ Wstawiam 22 nowe dania...')
await sql(`
INSERT INTO meals (name, category, prep_time, protein_per_serving, protein_rating, notes) VALUES
('Hot dogi','wieprzowina',20,null,'ok',null),
('Kasza z jajkiem','jajka',20,null,'ok',null),
('Pierogi wytrawne','szybkie',20,null,'ok',null),
('Makaron pesto','makaron',20,null,'ok',null),
('Risotto z kurczakiem','kurczak',20,null,'ok',null),
('Quesadilla z kurczakiem','kurczak',20,null,'ok',null),
('Lasagne','makaron',20,null,'ok',null),
('Tacos domowe','wieprzowina',20,null,'ok',null),
('Kiełbasa z kapustą','wieprzowina',20,null,'ok',null),
('Burrito bowl z kurczakiem','kurczak',20,null,'ok',null),
('Makaron z kiełbasą i papryką','wieprzowina',20,null,'ok',null),
('Karkówka z patelni z cebulą + ryż','wieprzowina',20,null,'ok',null),
('Kopytka z gulaszem kiełbasianym','wieprzowina',20,null,'ok',null),
('Pyzy ziemniaczane','ziemniaki',20,null,'ok',null),
('Pampuchy / kluski na parze','wieprzowina',20,null,'ok',null),
('Zupa pieczarkowa z makaronem','makaron',20,null,'ok',null),
('Ryż z truskawkami','slodkie',20,null,'ok',null),
('Kasza gryczana z kiełbasą','wieprzowina',20,null,'ok',null),
('Tortille z bitkami','szybkie',20,null,'ok',null),
('Kopytka z sosem pieczarkowym','ziemniaki',20,null,'ok',null),
('Kapuśniak z kiełbasą','wieprzowina',20,null,'ok',null)
`)
console.log('  ✓ 22 nowe dania')

// 5. Wstaw plan tygodniowy (52 tygodnie)
console.log('→ Wstawiam plan tygodniowy 52 tygodnie...')
const seedContent = readFileSync('G:/Mój dysk/.AI/PROJEKTY/AKTYWNE/MIESZKANKO LOSZKI/seed_full.sql', 'utf-8')
const planStart = seedContent.indexOf('INSERT INTO weekly_plan')
const planInsert = seedContent.slice(planStart)
await sql(planInsert)
console.log('  ✓ 364 wpisy (52×7)')

// 6. Wstaw rachunki
console.log('→ Wstawiam 5 rachunków...')
await sql(`
INSERT INTO bills (name, amount, due_day, category, active) VALUES
('Czynsz + opłaty', 1500, 10, 'mieszkanie', true),
('Prąd', 80, 15, 'media', true),
('Internet', 50, 20, 'media', true),
('Telefon (Adrian)', 35, 5, 'telefon', true),
('Telefon (Kasia)', 35, 5, 'telefon', true)
`)
console.log('  ✓ 5 rachunków')

console.log('\n✅ Seed zakończony! Sprawdź https://loszkiapp.vercel.app')
