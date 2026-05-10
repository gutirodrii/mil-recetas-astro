#!/usr/bin/env node
// Descarga 1 imagen Unsplash por categoría a public/img/categorias/{slug}.jpg
// y genera variante -lg.jpg (1280w) y -sm.jpg (480w) si está sharp instalado.
// Ejecuta una vez:  node scripts/fetch-category-images.mjs

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'img', 'categorias');
mkdirSync(outDir, { recursive: true });

// Unsplash photo URLs (curated, stable IDs, license free).
// w=1600 ya optimizado; añadimos &q=80 para JPEG razonable.
const SOURCES = {
  arroces:                          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1600&q=80',
  'carnes-y-aves':                  'https://images.unsplash.com/photo-1558030006-450675393462?w=1600&q=80',
  ensaladas:                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80',
  entrantes:                        'https://images.unsplash.com/photo-1541529086526-db283c563270?w=1600&q=80',
  huevos:                           'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1600&q=80',
  legumbres:                        'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1600&q=80',
  'pastas-y-masas':                 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=1600&q=80',
  'pescados-mariscos-y-moluscos':   'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1600&q=80',
  postres:                          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1600&q=80',
  'sopas-y-cremas':                 'https://images.unsplash.com/photo-1547592180-85f173990554?w=1600&q=80',
  'verduras-hortalizas-y-setas':    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1600&q=80',
  hero:                             'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1920&q=80',
};

async function downloadOne(slug, url) {
  const target = join(outDir, `${slug}.jpg`);
  if (existsSync(target)) {
    console.log(`✓ ${slug}.jpg ya existe, skip`);
    return;
  }
  process.stdout.write(`↓ ${slug}.jpg ... `);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`FAIL ${res.status}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(target, buf);
  console.log(`OK (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function maybeResize() {
  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch { console.log('\nsharp no instalado — saltando variantes -sm/-lg. (npm i -D sharp para activar)'); return; }
  const { readdirSync, readFileSync } = await import('node:fs');
  for (const f of readdirSync(outDir)) {
    if (!f.endsWith('.jpg') || f.includes('-sm') || f.includes('-lg')) continue;
    const slug = f.replace('.jpg', '');
    const src = readFileSync(join(outDir, f));
    for (const [suffix, w] of [['sm', 480], ['lg', 1280]]) {
      const out = join(outDir, `${slug}-${suffix}.jpg`);
      if (existsSync(out)) continue;
      await sharp(src).resize({ width: w }).jpeg({ quality: 78, mozjpeg: true }).toFile(out);
      console.log(`  ↳ ${slug}-${suffix}.jpg`);
    }
  }
}

for (const [slug, url] of Object.entries(SOURCES)) {
  try { await downloadOne(slug, url); }
  catch (e) { console.error(`ERROR ${slug}: ${e.message}`); }
}
await maybeResize();
console.log('\nListo.');
