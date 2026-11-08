/**
 * Build the market's reviewed bilingual seed.
 *
 * Run from the plugin directory:
 *   node scripts/seed-translations.mjs [--refresh]
 *
 * It fetches the community catalog, takes exactly the entries the market
 * caches (the same buildSnapshot the Host uses), translates the missing side
 * of each description, and writes data/translations.zh.json. Existing
 * translations are kept unless --refresh is passed, so a re-run only fills
 * gaps and new entries.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG_URL, buildSnapshot } from '../lib/market.js';
import { translateText } from '../lib/translate.js';

const root = path.resolve(import.meta.dirname, '..');
const seedPath = path.join(root, 'data', 'translations.zh.json');
const refresh = process.argv.includes('--refresh');

const existing = (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    return parsed && parsed.entries ? parsed.entries : {};
  } catch {
    return {};
  }
})();

const response = await fetch(CATALOG_URL, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`catalog responded ${response.status}`);
const catalog = await response.json();

const snapshot = buildSnapshot(catalog, null, existing);
const entries = snapshot.entries;
console.log(`catalog ${snapshot.catalogTotal} → cached ${entries.length}`);

const pending = entries
  .map((entry) => {
    const known = existing[entry.name] || {};
    const needZh = !known.zh && entry.descriptionEn && !entry.descriptionZh;
    const needEn = !known.en && entry.descriptionZh && !entry.descriptionEn;
    return needZh || needEn ? { entry, needZh, needEn, known } : null;
  })
  .filter(Boolean);

console.log(`need translation: ${pending.length} of ${entries.length}`);

let done = 0;
let index = 0;
const results = { ...existing };

async function worker() {
  while (index < pending.length) {
    const job = pending[index++];
    const { entry, needZh, needEn, known } = job;
    const next = { ...known };
    if (needZh) {
      const zh = await translateText(entry.descriptionEn, 'zh-CN');
      if (zh) next.zh = zh;
    }
    if (needEn) {
      const en = await translateText(entry.descriptionZh, 'en');
      if (en) next.en = en;
    }
    if (next.zh || next.en) results[entry.name] = next;
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${pending.length}`);
  }
}

await Promise.all(Array.from({ length: 4 }, worker));

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: CATALOG_URL,
  entries: results
};
fs.mkdirSync(path.dirname(seedPath), { recursive: true });
fs.writeFileSync(seedPath, `${JSON.stringify(output, null, 1)}\n`);
console.log(`wrote ${Object.keys(results).length} translations to ${seedPath}`);
