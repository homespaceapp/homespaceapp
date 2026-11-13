import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';

const port = 3314;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${origin}/kalendarz`);
      if (response.ok) return;
    } catch {
      // Serwer jeszcze startuje.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Serwer nie wystartował.\n${serverLog}`);
}

try {
  const vercelConfig = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.deepEqual(vercelConfig.regions, ['fra1']);

  const pwaConfig = await readFile('next.config.js', 'utf8');
  assert.match(pwaConfig, /cacheName: 'pages-v2-calendar-start'/);
  assert.match(pwaConfig, /networkTimeoutSeconds: 2/);

  const workerSource = await readFile('worker/index.js', 'utf8');
  assert.match(workerSource, /caches\.delete\('pages'\)/);

  const productionEnv = await readFile('.env.production', 'utf8');
  assert.match(productionEnv, /SUPABASE_URL=https:\/\/qlqnrsxpmoeoukfgovmy\.supabase\.co/);
  assert.doesNotMatch(productionEnv, /xgsuyvuyddqhklshohjl/);

  const nextConfig = await readFile('next.config.js', 'utf8');
  assert.match(nextConfig, /NEXT_PUBLIC_HOMESPACE_SUPABASE_URL: canonicalSupabaseUrl/);
  assert.match(nextConfig, /NEXT_PUBLIC_HOMESPACE_SUPABASE_ANON_KEY: canonicalSupabaseAnonKey/);

  await waitForServer();

  const root = await fetch(`${origin}/`, { redirect: 'manual' });
  assert.equal(root.status, 307);
  assert.equal(root.headers.get('location'), '/kalendarz');

  const calendar = await fetch(`${origin}/kalendarz`);
  assert.equal(calendar.status, 200);
  assert.equal(calendar.headers.get('x-nextjs-prerender'), '1');
  const calendarHtml = await calendar.text();
  assert.match(calendarHtml, /Ładowanie kalendarza|Kalendarz/);
  assert.match(calendarHtml, /qlqnrsxpmoeoukfgovmy\.supabase\.co/);
  assert.doesNotMatch(calendarHtml, /xgsuyvuyddqhklshohjl\.supabase\.co/);

  const dashboard = await fetch(`${origin}/pulpit`);
  assert.equal(dashboard.status, 200);

  const manifest = await fetch(`${origin}/manifest.json`).then((response) => response.json());
  assert.equal(manifest.start_url, '/kalendarz');

  console.log('STARTUP_E2E_PASS root=307 calendar=static pulpit=200 manifest=/kalendarz region=fra1');
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    once(server, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}
