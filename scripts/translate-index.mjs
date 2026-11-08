#!/usr/bin/env node
/**
 * Fill Chinese descriptions for the full accepted index.
 *
 * The featured 220 are hand-checked seeds; the remaining index entries are
 * translated once and persisted into data/translations.zh.json, so every
 * refresh and every public build gets the same complete bilingual catalog.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { translateText } from '../lib/translate.js';

const snapshotPath = path.join(os.homedir(), '.dsh', 'featured-market', 'snapshot.json');
const seedPath = new URL('../data/translations.zh.json', import.meta.url);
const CONCURRENCY = Number(process.env.FM_TRANSLATE_CONCURRENCY || 4);
const LIMIT = Number(process.env.FM_TRANSLATE_LIMIT || 0);

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
seed.entries = seed.entries || {};

const targets = (snapshot.index || []).filter((entry) => {
  if (!entry.descriptionEn) return false;
  if (entry.descriptionZh) return false;
  const known = seed.entries[entry.name];
  return !(known && known.zh);
});
if (LIMIT > 0) targets.length = Math.min(targets.length, LIMIT);

console.log(`index=${snapshot.index.length} missing=${targets.length} workers=${CONCURRENCY}`);
let done = 0;
let failed = 0;

function save() {
  snapshot.translations = Object.fromEntries(
    Object.entries(seed.entries).map(([name, value]) => [name, { zh: value.zh, en: value.en }]).filter(([, value]) => value.zh || value.en)
  );
  const temp = `${snapshotPath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(snapshot));
  fs.renameSync(temp, snapshotPath);
  seed.generatedAt = new Date().toISOString();
  const seedTemp = new URL('../data/translations.zh.json.tmp', import.meta.url);
  fs.writeFileSync(seedTemp, `${JSON.stringify(seed, null, 2)}\n`);
  fs.renameSync(seedTemp, seedPath);
}

async function worker() {
  while (targets.length) {
    const entry = targets.shift();
    if (!entry) return;
    try {
      const zh = await translateText(entry.descriptionEn, 'zh-CN');
      if (zh) {
        entry.descriptionZh = zh.slice(0, 320);
        const previous = seed.entries[entry.name] || {};
        seed.entries[entry.name] = { ...previous, zh: entry.descriptionZh, en: previous.en || entry.descriptionEn };
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      console.error('failed', entry.name, error && error.message);
    }
    done += 1;
    if (done % 25 === 0 || targets.length === 0) {
      save();
      console.log(`progress ${done} failed=${failed} remaining=${targets.length}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
save();
console.log(`done translated=${done} failed=${failed} seed=${Object.keys(seed.entries).length}`);
