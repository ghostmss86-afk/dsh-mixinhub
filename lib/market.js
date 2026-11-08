/**
 * Pure catalog → snapshot logic for the featured market, split out of the
 * Cordis row so it can be exercised without a running Harness.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CATALOG_URL = 'https://awesome-dsh-plugin.com/catalog.json';
export const REFRESH_HOUR = 4;

const HISTORY_DAYS = 14;
const TREND_DAYS = 7;
const FEATURED_COUNT = 14;
const LEADERBOARD_COUNT = 30;
const CARRY_COUNT = 220;

const CATEGORY_MAP = {
  ui: 'ui',
  theme: 'ui',
  market: 'market',
  tools: 'tools',
  vision: 'tools',
  browser: 'tools',
  docs: 'tools',
  workflow: 'workflow',
  session: 'workflow',
  skill: 'workflow',
  notify: 'connect',
  remote: 'connect',
  identity: 'connect',
  voice: 'connect',
  model: 'model',
  agi: 'model',
  memory: 'model',
  dev: 'dev',
  git: 'dev',
  security: 'dev',
  wsl: 'dev',
  usage: 'data',
  fun: 'fun'
};

const CATEGORY_HUE = {
  ui: 262,
  tools: 205,
  workflow: 158,
  connect: 190,
  model: 288,
  dev: 28,
  data: 44,
  fun: 332,
  market: 215
};

const CATEGORY_ORDER = ['ui', 'workflow', 'tools', 'connect', 'model', 'dev', 'data', 'fun', 'market'];

export function dataDir() {
  const base = process.env.DSH_PROFILE_DIR || path.join(os.homedir(), '.dsh');
  return path.join(base, 'featured-market');
}

export function snapshotPath() {
  return path.join(dataDir(), 'snapshot.json');
}

export function loadSeedTranslations() {
  try {
    const seedPath = new URL('../data/translations.zh.json', import.meta.url);
    const parsed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    return parsed && parsed.entries ? parsed.entries : {};
  } catch (error) {
    console.warn('[featured-market] seed translations unavailable', error && error.message ? error.message : error);
    return {};
  }
}

export function readSnapshot() {
  try {
    const parsed = JSON.parse(fs.readFileSync(snapshotPath(), 'utf8'));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSnapshot(snapshot) {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const target = snapshotPath();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(snapshot));
  fs.renameSync(temporary, target);
}

export function localDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nextRefreshLabel(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REFRESH_HOUR, 0, 0, 0);
  const next = now.getTime() < today.getTime() ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return next.toISOString();
}

export function shouldRefresh(snapshot, now = new Date()) {
  if (!snapshot || !snapshot.generatedDay) return true;
  if (snapshot.generatedDay === localDay(now)) return false;
  return now.getHours() >= REFRESH_HOUR;
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function humanize(raw) {
  const base = String(raw)
    .replace(/^@[^/]+\//, '')
    .replace(/^dsh[-_]/i, '')
    .replace(/^deepseek[-_]/i, '');
  const acronyms = new Set(['cc', 'im', 'ui', 'ai', 'api', 'mcp', 'tts', 'stt', 'ocr', 'git', 'ci', 'db', 'pdf', 'llm', 'rag', 'ssh', 'tui', 'cli', 'json', 'html', 'css', 'js', 'ts', 'dsh']);
  const words = base.split(/[-_.\s]+/).filter(Boolean);
  if (!words.length) return String(raw);
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms.has(lower)) return lower.toUpperCase();
      if (/^[a-z]/.test(word)) return word[0].toUpperCase() + word.slice(1);
      return word;
    })
    .join(' ');
}

export function isChinese(text) {
  const source = String(text || '');
  if (!source) return false;
  const cjk = source.match(/[\u4e00-\u9fa5]/g);
  return Boolean(cjk && cjk.length / source.length > 0.25);
}

export function cleanName(value) {
  const name = String(value || '').trim();
  if (!name || name.includes('#')) return null;
  if (!/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) return null;
  return name;
}

function installSpec(item) {
  const command = String(item.cmd || '');
  const match = command.match(/\badd\s+(\S+)\s*$/);
  const spec = match ? match[1] : String(item.name || '');
  if (!spec || spec.includes('#')) return null;
  return spec;
}

function ageInDays(value, now) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 999;
  return Math.max(0, (now.getTime() - time) / 86400000);
}

function heatOf(item, now) {
  const dl = num(item.dl);
  const stars = num(item.stars);
  const dlScore = Math.min(1, Math.log10(1 + dl) / 6);
  const starScore = Math.min(1, Math.log10(1 + stars) / 4.2);
  const freshness = Math.max(0, Math.min(1, 1 - ageInDays(item.added, now) / 240));
  return Math.round(100 * (0.52 * dlScore + 0.33 * starScore + 0.15 * freshness));
}

function badgesOf(item, heat, now) {
  const list = [];
  if (num(item.dl) >= 150000 && num(item.stars) >= 2000) list.push('loved');
  if (num(item.stars) >= 3000) list.push('starred');
  if (ageInDays(item.added, now) <= 45) list.push('new');
  if (heat >= 85) list.push('hot');
  return list;
}

function toEntry(item, now, translations) {
  const name = cleanName(item.name);
  if (!name) return null;
  const description = String(item.desc || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (description.length < 24) return null;
  const download = num(item.dl);
  const stars = num(item.stars);
  if (stars < 25 && download < 1200) return null;
  const category = CATEGORY_MAP[item.cat] || null;
  if (!category) return null;
  const heat = heatOf(item, now);
  const spec = installSpec(item);
  const known = (translations && translations[name]) || {};
  const chinese = isChinese(description);
  const descriptionZh = typeof known.zh === 'string' && known.zh ? known.zh : chinese ? description : null;
  const descriptionEn = typeof known.en === 'string' && known.en ? known.en : chinese ? null : description;
  return {
    name,
    title: humanize(item.short || name),
    owner: String(item.owner || ''),
    slug: String(item.slug || ''),
    description: (descriptionEn || descriptionZh || description).slice(0, 320),
    descriptionZh: descriptionZh ? descriptionZh.slice(0, 320) : null,
    descriptionEn: descriptionEn ? descriptionEn.slice(0, 320) : null,
    category,
    downloads: download,
    stars,
    added: String(item.added || ''),
    heat,
    badges: badgesOf(item, heat, now),
    spec,
    installable: Boolean(spec),
    command: String(item.cmd || ''),
    href: String(item.href || ''),
    hue: CATEGORY_HUE[category] || 220
  };
}

export function buildSnapshot(catalog, previous, translations = {}) {
  const now = new Date();
  const day = localDay(now);
  const rawItems = Array.isArray(catalog && catalog.items) ? catalog.items : [];
  const seen = new Map();

  for (const item of rawItems) {
    if (!item || item.npm !== 1) continue;
    const entry = toEntry(item, now, translations);
    if (!entry) continue;
    const existing = seen.get(entry.name);
    if (!existing || entry.heat > existing.heat) seen.set(entry.name, entry);
  }

  const all = [...seen.values()];
  const ranked = all
    .slice()
    .sort((a, b) => b.heat - a.heat || b.downloads - a.downloads || b.stars - a.stars);
  const position = new Map(ranked.map((entry, index) => [entry.name, index + 1]));

  const previousHistory = previous && Array.isArray(previous.history) ? previous.history : [];
  const previousDay = previousHistory.length ? previousHistory[previousHistory.length - 1] : null;
  const previousHeat = (previousDay && previousDay.heat) || {};
  const previousRank = (previousDay && previousDay.rank) || {};
  const hasBaseline = Object.keys(previousRank).length > 0;

  for (const entry of ranked) {
    const before = previousHeat[entry.name];
    entry.delta = typeof before === 'number' ? entry.heat - before : null;
    const beforeRank = previousRank[entry.name];
    entry.rankDelta = !hasBaseline
      ? 0
      : typeof beforeRank === 'number'
        ? beforeRank - position.get(entry.name)
        : null;
    const trail = [];
    for (const record of previousHistory.slice(-TREND_DAYS)) {
      const value = record.heat && record.heat[entry.name];
      trail.push(typeof value === 'number' ? value : null);
    }
    trail.push(entry.heat);
    entry.trend = trail.slice(-TREND_DAYS);
  }

  const featured = [];
  const perCategory = new Map();
  for (const entry of ranked) {
    if (featured.length >= FEATURED_COUNT) break;
    const used = perCategory.get(entry.category) || 0;
    if (used >= 2) continue;
    perCategory.set(entry.category, used + 1);
    featured.push(entry);
  }

  const leaderboard = ranked.slice(0, LEADERBOARD_COUNT).map((entry) => ({
    name: entry.name,
    rank: position.get(entry.name)
  }));

  const carry = ranked.slice(0, CARRY_COUNT);
  const index = ranked.map((entry) => ({
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
    descriptionEn: entry.descriptionEn ? entry.descriptionEn.slice(0, 180) : null,
    descriptionZh: entry.descriptionZh ? entry.descriptionZh.slice(0, 180) : null
  }));
  const categories = CATEGORY_ORDER.map((id) => ({
    id,
    count: all.filter((entry) => entry.category === id).length
  })).filter((category) => category.count > 0);

  const heat = {};
  const rank = {};
  for (const entry of carry) {
    heat[entry.name] = entry.heat;
    rank[entry.name] = position.get(entry.name);
  }

  const history = previousHistory
    .filter((record) => record && record.day && record.day !== day)
    .slice(-(HISTORY_DAYS - 1));
  history.push({ day, heat, rank });

  return {
    version: 1,
    generatedAt: now.toISOString(),
    generatedDay: day,
    catalogTotal: rawItems.length,
    accepted: all.length,
    entries: carry,
    index,
    featured: featured.map((entry) => entry.name),
    leaderboard,
    categories,
    history
  };
}
