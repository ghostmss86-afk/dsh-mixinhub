#!/usr/bin/env node
/**
 * Build the public, read-only catalog used by GitHub Pages.
 *
 * Local builds reuse the snapshot the Host already refreshed. With --remote
 * (used by the Pages workflow) it downloads the live community catalog and
 * rebuilds the same snapshot logic, so the public page does not depend on one
 * person's laptop being awake.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG_URL, buildSnapshot, loadSeedTranslations, readSnapshot } from '../lib/market.js';

const remote = process.argv.includes('--remote');
const output = path.join(process.cwd(), 'docs', 'catalog.json');
const llmsSource = path.join(process.cwd(), 'llms.txt');
const llmsOutput = path.join(process.cwd(), 'docs', 'llms.txt');

function pick(entry) {
  return {
    name: entry.name,
    title: entry.title,
    owner: entry.owner,
    category: entry.category,
    downloads: entry.downloads,
    stars: entry.stars,
    heat: entry.heat,
    added: entry.added,
    spec: entry.spec,
    command: entry.command,
    href: entry.href,
    hue: entry.hue,
    descriptionEn: entry.descriptionEn || entry.description || '',
    descriptionZh: entry.descriptionZh || entry.description || ''
  };
}

let snapshot = remote ? null : readSnapshot();
if (!snapshot) {
  const response = await fetch(CATALOG_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`catalog fetch failed: HTTP ${response.status}`);
  const catalog = await response.json();
  snapshot = buildSnapshot(catalog, null, loadSeedTranslations());
}

const payload = {
  generatedAt: snapshot.generatedAt || new Date().toISOString(),
  catalogTotal: snapshot.catalogTotal || 0,
  accepted: snapshot.accepted || snapshot.entries.length,
  categories: snapshot.categories || [],
  featured: (snapshot.featured || []).map((item) => item.name),
  entries: snapshot.entries.map(pick)
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(payload)}\n`);
console.log(`wrote ${output}: ${payload.entries.length} entries, ${(fs.statSync(output).size / 1024).toFixed(1)} KiB`);
if (fs.existsSync(llmsSource)) {
  fs.copyFileSync(llmsSource, llmsOutput);
  console.log(`wrote ${llmsOutput}`);
}
