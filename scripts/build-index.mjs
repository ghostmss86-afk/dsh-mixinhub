#!/usr/bin/env node
/**
 * Build a format-1 plugin index (docs/index.json) from the public catalog.
 *
 * Format 1 is the interchange format DeepSeek Harness and several community
 * markets already read (see dsh-plugin-catalog). Publishing one lets other
 * tools depend on this market, which is the cheapest distribution loop we have.
 *
 * The npm registry is queried once per package (cached in data/index-cache.json
 * for TTL ms) to confirm the package is a real DSH bundle and to pick up its
 * latest version. Entries that are not `dsh.bundle` packages are skipped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = join(ROOT, 'docs/catalog.json');
const SELF = 'dsh-featured-market';
const CACHE = join(ROOT, 'data/index-cache.json');
const OUT = join(ROOT, 'docs/index.json');
const SITE = 'https://ghostmss86-afk.github.io/dsh-featured-market/';

const TTL = 12 * 60 * 60 * 1000;
const CONCURRENCY = 4;
const RETRIES = 6;

const argv = process.argv.slice(2);
const limitAt = argv.indexOf('--limit');
const LIMIT = limitAt > -1 ? Number(argv[limitAt + 1]) || Infinity : Infinity;
const quiet = argv.includes('--quiet');

const CATEGORIES = {
  ui: { en: 'UI Enhancements', zh: '界面增强' },
  workflow: { en: 'Workflow & Automation', zh: '工作流与自动化' },
  tools: { en: 'Tools & Capabilities', zh: '工具与能力' },
  connect: { en: 'Connections & Integrations', zh: '连接与集成' },
  model: { en: 'Models & Providers', zh: '模型与账号接入' },
  dev: { en: 'Developer Tools', zh: '开发者工具' },
  data: { en: 'Data & Storage', zh: '数据与存储' },
  fun: { en: 'Fun & Delight', zh: '趣味与装饰' },
  market: { en: 'Plugin Markets & Managers', zh: '插件市场与管理' },
};

const log = (...a) => { if (!quiet) console.log(...a); };

function loadJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const selfVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const cache = loadJson(CACHE, {});
const entries = (catalog.entries || []).slice(0, LIMIT);

const pkgOf = (entry) => String(entry.spec || entry.name || '').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchLatest(pkg) {
  const url = `https://registry.npmjs.org/${pkg.replace('/', '%2f')}/latest`;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20000);
    try {
      const res = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
      if (res.status === 404) return { missing: true };
      if (res.status === 429) {
        const after = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(after) && after > 0 ? after * 1000 : 2500 * (attempt + 1);
        if (attempt === RETRIES) return { error: 'HTTP 429' };
        await sleep(Math.min(wait, 30000));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === RETRIES) return { error: String(err && err.message ? err.message : err) };
      await sleep(800 * 2 ** attempt + Math.random() * 400);
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: 'unreachable' };
}

function normalizeRepo(repo) {
  if (!repo) return null;
  const raw = typeof repo === 'string' ? repo : repo.url;
  if (!raw) return null;
  const url = String(raw)
    .replace(/^git\+/, '')
    .replace(/^github:/, 'https://github.com/')
    .replace(/\.git$/, '');
  return /^https?:\/\//.test(url) ? url : null;
}

function languageDescription(entry) {
  const en = (entry.descriptionEn || entry.short || '').trim();
  const zh = (entry.descriptionZh || '').trim();
  return { en: en || zh, zh: zh || en };
}

function publishTimestamp(entry) {
  const iso = entry.added ? `${entry.added}T00:00:00Z` : '';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
}

let cursor = 0;
const plugins = [];
const stats = { total: entries.length, ok: 0, notBundle: 0, missing: 0, error: 0, cached: 0 };

async function worker() {
  while (cursor < entries.length) {
    const entry = entries[cursor];
    cursor += 1;
    const pkg = pkgOf(entry);
    if (!pkg) continue;

    let record = cache[pkg];
    if (!record || Date.now() - (record.fetchedAt || 0) > TTL) {
      const manifest = await fetchLatest(pkg);
      if (manifest.missing) record = { missing: true, fetchedAt: Date.now() };
      else if (manifest.error) record = record || { error: manifest.error, fetchedAt: 0 };
      else {
        record = {
          version: manifest.version,
          hasBundle: Boolean(manifest.dsh && manifest.dsh.bundle),
          engines: manifest.engines || {},
          repository: normalizeRepo(manifest.repository),
          keywords: Array.isArray(manifest.keywords) ? manifest.keywords.slice(0, 8) : [],
          fetchedAt: Date.now(),
        };
      }
      cache[pkg] = record;
    } else {
      stats.cached += 1;
    }

    if (pkg === SELF) record = { ...record, version: selfVersion, hasBundle: true };

    if (!record || record.missing) { stats.missing += 1; continue; }
    if (record.error && !record.version) { stats.error += 1; continue; }
    if (!record.hasBundle) { stats.notBundle += 1; continue; }

    const description = languageDescription(entry);
    if (!description.en) { stats.notBundle += 1; continue; }

    plugins.push({
      name: pkg,
      title: `${entry.owner}/${entry.name}`,
      description,
      homepage: `${SITE}?q=${encodeURIComponent(pkg)}`,
      repository: record.repository ? { url: record.repository } : { url: `https://www.npmjs.com/package/${pkg}` },
      metadata: {
        category: CATEGORIES[entry.category] ? entry.category : 'tools',
        keywords: record.keywords || [],
        labels: [],
        sortKeys: {},
      },
      versions: [{
        version: pkg === SELF ? selfVersion : record.version,
        publishTimestamp: publishTimestamp(entry),
        source: { type: 'npm' },
        engines: record.engines || {},
      }],
    });
    stats.ok += 1;
  }
}

log(`building index from ${entries.length} catalog entries…`);
const started = Date.now();
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length || 1) }, worker));

plugins.sort((a, b) => a.name.localeCompare(b.name));

const index = {
  format: 1,
  title: { en: 'Featured Plugin Market', zh: '精选插件市场' },
  description: {
    en: 'A curated DeepSeek Harness plugin index: every entry is installable, bilingual, and ranked by a published heat formula. Maintained by dsh-featured-market.',
    zh: '一份经过筛选的 DeepSeek Harness 插件索引：全部可安装、中英双语、热度公式公开。由 dsh-featured-market 维护。',
  },
  metadata: {
    categories: Object.fromEntries(
      Object.entries(CATEGORIES).map(([id, title]) => [id, { title }]),
    ),
    labels: {},
    sortKeys: {},
  },
  plugins,
};

mkdirSync(dirname(CACHE), { recursive: true });
writeFileSync(CACHE, `${JSON.stringify(cache)}\n`);
writeFileSync(OUT, `${JSON.stringify(index, null, 1)}\n`);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
log(`wrote ${plugins.length} plugins to docs/index.json in ${seconds}s`);
log(`  bundles ${stats.ok} · not-a-bundle ${stats.notBundle} · missing ${stats.missing} · error ${stats.error} · cache hits ${stats.cached}`);

if (!plugins.length) {
  console.error('refusing to leave an empty index behind');
  process.exit(1);
}
