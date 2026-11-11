/**
 * Featured plugin market.
 *
 * Host half: refresh the community catalog once a day (04:00 local), score
 * every plugin for heat, keep two weeks of history so the leaderboard can show
 * real movement, persist the result, and expose it to the browser over the
 * local HTTP carrier. Installing a plugin goes through the profile's own
 * `pluginManager`, so the market never invents an install path of its own.
 */
import {
  CATALOG_URL,
  REFRESH_HOUR,
  buildSnapshot,
  cleanName,
  loadSeedTranslations,
  nextRefreshLabel,
  readSnapshot,
  shouldRefresh,
  writeSnapshot
} from './lib/market.js';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { translateText } from './lib/translate.js';
import { compareVersions, satisfies } from './lib/semver.js';

const WRITE_TOKEN = randomBytes(24).toString('hex');
const FETCH_TIMEOUT_MS = 45000;
const TICK_MS = 10 * 60 * 1000;
const INSTALL_TTL_MS = 30 * 60 * 1000;
const TRANSLATE_BATCH = 30;
const TRANSLATE_BUDGET_MS = 45000;
const CATEGORY_LABELS = {
  ui: '界面',
  workflow: '工作流',
  tools: '工具',
  connect: '连接',
  model: '模型',
  dev: '开发',
  data: '数据',
  fun: '趣味',
  market: '市场'
};

function clip(value, max = 150) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('，'), cut.lastIndexOf(' '));
  return `${(boundary > max * 0.6 ? cut.slice(0, boundary) : cut).trim()}…`;
}

export function apply(ctx) {
  let snapshot = readSnapshot();
  let refreshing = false;
  let refreshError = null;
  const seed = loadSeedTranslations();
  let learned = (snapshot && snapshot.translations) || {};
  const installs = new Map();
  const get = (name) => (typeof ctx.get === 'function' ? ctx.get(name) : undefined);

  const PROJECTS_PATH = path.join(os.homedir(), '.dsh', 'featured-market', 'projects.json');
  // The same format-1 document this plugin publishes is also a valid DSH
  // Discover index source. Registering it once (never again after the user
  // removes it) is how a reader can find the bilingual entries without
  // copying a URL.
  const INDEX_SOURCE_URL = 'https://cdn.jsdelivr.net/gh/ghostmss86-afk/dsh-featured-market@main/docs/index.json';
  const INDEX_SOURCE_PATH = path.join(os.homedir(), '.dsh', 'featured-market', 'index-source.json');

  const PROJECT_TTL_MS = 5 * 60 * 1000;
  const MAX_PROJECTS = 12;

  const defaultProject = () => ({
    id: 'ghostmss86-afk/dsh-featured-market',
    title: '精选插件市场',
    repo: 'ghostmss86-afk/dsh-featured-market',
    npm: 'dsh-featured-market',
    addedAt: new Date().toISOString(),
    lastSeenFeedbackAt: new Date().toISOString(),
    history: []
  });

  function loadProjects() {
    try {
      const parsed = JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8'));
      const list = Array.isArray(parsed) ? parsed : parsed && parsed.projects;
      if (Array.isArray(list) && list.length) return list.slice(0, MAX_PROJECTS);
    } catch {
      /* first run or unreadable file: fall back to the user's own project */
    }
    return [defaultProject()];
  }

  function saveProjects() {
    try {
      fs.mkdirSync(path.dirname(PROJECTS_PATH), { recursive: true });
      fs.writeFileSync(PROJECTS_PATH, JSON.stringify({ version: 1, projects: projectItems }, null, 2));
    } catch {
      /* the dashboard is still usable for this session */
    }
  }

  let projectItems = loadProjects();
  const projectCache = new Map();

  let ghTokenCache;
  function githubToken() {
    if (ghTokenCache !== undefined) return ghTokenCache;
    ghTokenCache = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    if (!ghTokenCache) {
      try {
        ghTokenCache = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', timeout: 3000 }).trim();
      } catch {
        ghTokenCache = '';
      }
    }
    return ghTokenCache;
  }

  async function githubJson(url, timeout = 12000) {
    const headers = {
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-featured-market'
    };
    const token = githubToken();
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers });
    if (!response.ok) throw new Error(`github ${response.status}`);
    return response.json();
  }

  async function npmDownloads(name) {
    const encoded = String(name).split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encoded}`, {
      signal: AbortSignal.timeout(12000),
      headers: { accept: 'application/json' }
    });
    if (response.status === 404) return 0;
    if (!response.ok) throw new Error(`npm ${response.status}`);
    const body = await response.json();
    return typeof body.downloads === 'number' ? body.downloads : null;
  }

  function deltaOf(history, key, days = 7) {
    if (!Array.isArray(history) || history.length < 2) return null;
    const current = history[history.length - 1];
    if (!current || typeof current[key] !== 'number') return null;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let past = history[0];
    for (const point of history) {
      if (Date.parse(point.at) <= cutoff) past = point;
    }
    return typeof past[key] === 'number' ? current[key] - past[key] : null;
  }

  function projectHistory(project, stars, downloads) {
    const history = Array.isArray(project.history) ? project.history.slice(-59) : [];
    const previous = history[history.length - 1];
    const now = new Date().toISOString();
    if (!previous || Date.now() - Date.parse(previous.at) > 6 * 60 * 60 * 1000) {
      history.push({ at: now, stars, downloads });
    } else {
      history[history.length - 1] = { at: now, stars, downloads };
    }
    return history;
  }

  async function readProject(project, force = false) {
    const cached = projectCache.get(project.id);
    if (!force && cached && Date.now() - cached.at < PROJECT_TTL_MS) return cached.data;
    const next = { ...project };
    const errors = [];
    let stars = typeof project.stars === 'number' ? project.stars : null;
    let downloads = typeof project.downloads === 'number' ? project.downloads : null;

    if (project.repo) {
      try {
        const repo = await githubJson(`https://api.github.com/repos/${project.repo}`);
        stars = typeof repo.stargazers_count === 'number' ? repo.stargazers_count : stars;
        next.stars = stars;
        next.forks = typeof repo.forks_count === 'number' ? repo.forks_count : null;
        next.openIssues = typeof repo.open_issues_count === 'number' ? repo.open_issues_count : null;
        next.description = repo.description || '';
        next.repoUrl = repo.html_url || `https://github.com/${project.repo}`;
        next.pushedAt = repo.pushed_at || null;
      } catch (error) {
        errors.push(error && error.message ? error.message : 'github-failed');
      }
    }

    if (project.npm) {
      try {
        downloads = await npmDownloads(project.npm);
        next.downloads = downloads;
      } catch (error) {
        errors.push(error && error.message ? error.message : 'npm-failed');
      }
    }

    if (project.repo) {
      try {
        const issues = await githubJson(
          `https://api.github.com/repos/${project.repo}/issues?state=open&sort=created&direction=desc&per_page=20`
        );
        next.feedback = (Array.isArray(issues) ? issues : [])
          .filter((issue) => issue && !issue.pull_request)
          .slice(0, 10)
          .map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title || '',
            url: issue.html_url || '',
            author: issue.user && issue.user.login ? issue.user.login : 'unknown',
            createdAt: issue.created_at || null,
            comments: issue.comments || 0,
            labels: Array.isArray(issue.labels) ? issue.labels.map((label) => label.name).filter(Boolean) : []
          }));
      } catch (error) {
        errors.push(error && error.message ? error.message : 'issues-failed');
      }
    }

    if (project.npm && snapshot && Array.isArray(snapshot.index)) {
      const rank = snapshot.index.findIndex((entry) => entry.name === project.npm);
      next.market = rank >= 0
        ? {
            listed: true,
            rank: rank + 1,
            heat: snapshot.index[rank].heat,
            downloads: snapshot.index[rank].downloads,
            stars: snapshot.index[rank].stars,
            category: snapshot.index[rank].category
          }
        : { listed: false };
    }

    next.history = projectHistory(next, stars, downloads);
    next.starsDelta = deltaOf(next.history, 'stars');
    next.downloadsDelta = deltaOf(next.history, 'downloads');
    next.lastUpdated = new Date().toISOString();
    next.error = errors.length ? errors.join('; ') : null;
    next.unread = (next.feedback || []).filter(
      (item) => item.createdAt && Date.parse(item.createdAt) > Date.parse(project.lastSeenFeedbackAt || 0)
    ).length;
    projectCache.set(project.id, { at: Date.now(), data: next });
    return next;
  }

  function publicProject(project) {
    return {
      id: project.id,
      title: project.title || project.repo || project.npm || project.id,
      repo: project.repo || null,
      npm: project.npm || null,
      stars: typeof project.stars === 'number' ? project.stars : null,
      starsDelta: typeof project.starsDelta === 'number' ? project.starsDelta : null,
      downloads: typeof project.downloads === 'number' ? project.downloads : null,
      downloadsDelta: typeof project.downloadsDelta === 'number' ? project.downloadsDelta : null,
      forks: typeof project.forks === 'number' ? project.forks : null,
      openIssues: typeof project.openIssues === 'number' ? project.openIssues : null,
      description: project.description || '',
      repoUrl: project.repoUrl || (project.repo ? `https://github.com/${project.repo}` : null),
      lastUpdated: project.lastUpdated || null,
      error: project.error || null,
      unread: project.unread || 0,
      market: project.market || null,
      lastSeenFeedbackAt: project.lastSeenFeedbackAt || null,
      history: Array.isArray(project.history) ? project.history.slice(-30) : [],
      feedback: Array.isArray(project.feedback) ? project.feedback : []
    };
  }

  async function fillTranslations(next) {
    const pool = new Map();
    for (const entry of [...next.entries, ...(next.index || [])]) {
      if (!pool.has(entry.name)) pool.set(entry.name, entry);
    }
    const pending = [...pool.values()]
      .filter((entry) => !entry.descriptionZh || !entry.descriptionEn)
      .slice(0, TRANSLATE_BATCH);
    if (!pending.length) return;

    const deadline = Date.now() + TRANSLATE_BUDGET_MS;
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length && Date.now() < deadline) {
        const entry = pending[cursor++];
        if (!entry.descriptionZh && entry.descriptionEn) {
          const zh = await translateText(entry.descriptionEn, 'zh-CN');
          if (zh) {
            entry.descriptionZh = zh.slice(0, 320);
            learned[entry.name] = { ...(learned[entry.name] || {}), zh: entry.descriptionZh };
          }
        } else if (!entry.descriptionEn && entry.descriptionZh) {
          const en = await translateText(entry.descriptionZh, 'en');
          if (en) {
            entry.descriptionEn = en.slice(0, 320);
            learned[entry.name] = { ...(learned[entry.name] || {}), en: entry.descriptionEn };
          }
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));

    const current = new Set([...next.entries, ...(next.index || [])].map((entry) => entry.name));
    const entries = Object.entries(learned);
    const keep = entries.filter(([name]) => current.has(name));
    const spare = entries.filter(([name]) => !current.has(name)).slice(-600);
    learned = Object.fromEntries(keep.concat(spare));
  }

  async function refresh() {
    if (refreshing) return snapshot;
    refreshing = true;
    try {
      const response = await fetch(CATALOG_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`catalog responded ${response.status}`);
      const catalog = await response.json();
      const next = buildSnapshot(catalog, snapshot, { ...learned, ...seed });
      await fillTranslations(next);
      next.translations = learned;
      writeSnapshot(next);
      snapshot = next;
      refreshError = null;
    } catch (error) {
      refreshError = error && error.message ? error.message : String(error);
      if (snapshot) snapshot = { ...snapshot, lastError: refreshError };
    } finally {
      refreshing = false;
    }
    return snapshot;
  }

  // ---------- installed skills (read-only) ----------
  // Skills are a different concept from plugins: a skill file under a skills
  // directory gives the Agent a capability and never adds a button. Users keep
  // asking where to "open" them, so this endpoint lists every installed skill
  // with what it does, when it triggers, and a prompt the user can say. It is
  // strictly read-only: it parses SKILL.md front matter and nothing else.
  const SKILL_DIRS = [
    path.join(os.homedir(), '.workbuddy', 'skills'),
    path.join(os.homedir(), '.dsh', 'skills'),
    path.join(os.homedir(), '.claude', 'skills')
  ];

  function parseFrontMatter(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || '');
    if (!match) return {};
    const data = {};
    const listKeys = new Set();
    const lines = match[1].split(/\r?\n/);
    let key = null;
    for (const line of lines) {
      if (/^-\s+/.test(line) && key) {
        listKeys.add(key);
        data[key] = `${data[key] || ''} ${line.replace(/^-\s+/, '').trim()}`.trim();
        continue;
      }
      const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
      if (kv) {
        key = kv[1];
        let value = kv[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        data[key] = value;
      } else if (key && /^\s+\S/.test(line)) {
        data[key] = `${data[key] || ''} ${line.trim()}`.trim();
      }
    }
    for (const listKey of listKeys) {
      if (!data[listKey]) delete data[listKey];
    }
    return data;
  }

  function firstParagraph(body) {
    const stripped = String(body || '')
      .replace(/^---[\s\S]*?---/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .split(/\r?\n/);
    const parts = [];
    for (const line of stripped) {
      const trimmed = line.trim();
      if (!trimmed) { if (parts.length) break; continue; }
      if (trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (parts.length) break;
        continue;
      }
      parts.push(trimmed.replace(/[*_`]/g, ''));
    }
    return parts.join(' ').slice(0, 320);
  }

  function skillDirectories() {
    const dirs = [];
    for (const base of SKILL_DIRS) {
      let entries = [];
      try { entries = fs.readdirSync(base, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        const skillFile = path.join(base, entry.name, 'SKILL.md');
        try {
          if (!fs.statSync(skillFile).isFile()) continue;
        } catch { continue; }
        dirs.push({ base, name: entry.name, skillFile });
      }
    }
    return dirs;
  }

  function readSkills() {
    const items = [];
    const seen = new Set();
    for (const entry of skillDirectories()) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      let text = '';
      try { text = fs.readFileSync(entry.skillFile, 'utf8'); } catch { continue; }
      const meta = parseFrontMatter(text);
      const cleanDesc = (value) =>
        String(value || '')
          .replace(/^\s*\|\s*/, '')
          .replace(/\s*-\s*(Read|Write|Edit|Bash|Glob|Grep|WebFetch|WebSearch|AskUserQuestion|Task|TodoWrite|NotebookEdit|MultiEdit)\b.*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      const description = cleanDesc(meta.description_en || meta.description);
      const descriptionZh = cleanDesc(meta.description_zh);
      // A "say this" prompt derived from the skill's own trigger words, so the
      // user has something concrete to copy instead of a vague description.
      // Pull trigger words from the description's quoted phrases or its
      // "Use when …" clause; fall back to the skill name so there is always a
      // concrete sentence the user can paste.
      const quoted = (String(meta.description || '') + ' ' + description).match(/[""“”]([^""“”]{2,20})[""“”]/g);
      let triggerList = (quoted || []).map((t) => t.replace(/[""“”]/g, '').trim()).filter(Boolean).slice(0, 8);
      if (!triggerList.length) {
        const useWhen = /(?:use when|当用户)[^.。]*/i.exec(String(meta.description || '') + ' ' + description);
        if (useWhen) {
          triggerList = useWhen[0]
            .replace(/^(?:use when|当用户)\s*/i, '')
            .split(/[,，、;；]|\bor\b|或/)
            .map((t) => t.trim().replace(/[.。]$/, ''))
            .filter((t) => t.length >= 2 && t.length <= 24)
            .slice(0, 5);
        }
      }
      const prompt = triggerList.length
        ? `请用「${entry.name}」技能帮我：${triggerList.slice(0, 3).join('、')}`
        : `请用「${entry.name}」技能帮我处理这个任务`;
      items.push({
        name: meta.name || entry.name,
        dir: entry.name,
        description,
        descriptionEn: description,
        descriptionZh,
        whenToUse: firstParagraph(text),
        triggers: triggerList,
        prompt,
        path: entry.skillFile,
        docUrl: `file://${entry.skillFile}`,
        source: path.basename(entry.base)
      });
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  async function bundles() {
    const pluginManager = get('pluginManager');
    if (!pluginManager || typeof pluginManager.listBundles !== 'function') return [];
    try {
      const list = await pluginManager.listBundles();
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  const UPDATES_TTL_MS = 5 * 60 * 1000;
  let updatesCache = { at: 0, value: null };

  function invalidateUpdates() {
    updatesCache = { at: 0, value: null };
  }

  async function collectUpdates(force = false) {
    if (!force && updatesCache.value && Date.now() - updatesCache.at < UPDATES_TTL_MS) {
      return updatesCache.value;
    }
    const pluginManager = get('pluginManager');
    if (!pluginManager || typeof pluginManager.listVersions !== 'function') {
      return { items: [], count: 0, checkedAt: new Date().toISOString(), unavailable: true };
    }
    const installed = (await bundles()).filter((bundle) => bundle && bundle.installed);
    const items = [];
    for (const bundle of installed) {
      try {
        const listed = await pluginManager.listVersions(bundle.name, undefined, AbortSignal.timeout(9000));
        if (listed && listed.status === 'listed' && Array.isArray(listed.versions) && listed.versions.length) {
          items.push({
            name: bundle.name,
            current: bundle.version || null,
            latest: listed.versions[0].version,
            versions: listed.versions.slice(0, 5).map((version) => version.version)
          });
        } else {
          items.push({ name: bundle.name, current: bundle.version || null, latest: null, problem: (listed && listed.problem) || 'not-updatable' });
        }
      } catch (error) {
        items.push({ name: bundle.name, current: bundle.version || null, latest: null, problem: 'unknown' });
      }
    }
    const count = items.filter((item) => item.latest && item.current && item.latest !== item.current).length;
    const value = { items, count, checkedAt: new Date().toISOString() };
    updatesCache = { at: Date.now(), value };
    return value;
  }

  const MANIFEST_TTL_MS = 10 * 60 * 1000;
  const manifestCache = new Map();
  let runtimeCache = null;

  async function runtimeVersion() {
    if (runtimeCache && Date.now() - runtimeCache.at < 5 * 60 * 1000) return runtimeCache.version;
    const list = await bundles();
    const base = list.find((bundle) => bundle && bundle.name === '@deepseek-ai/dsh-base' && bundle.version);
    const version = base ? String(base.version) : null;
    runtimeCache = { at: Date.now(), version };
    return version;
  }

  // Bundle meta titles can be a plain string or a { en, zh } object. The
  // client renders the title directly, so a raw object crashes React
  // (error #31 "objects are not valid as a React child"). Normalise to a
  // bilingual object so the client can pick by language.
  function plainTitle(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const en = typeof value.en === 'string' ? value.en : '';
      const zh = typeof value.zh === 'string' ? value.zh : '';
      if (en || zh) return { en: en || zh, zh: zh || en };
    }
    return undefined;
  }

  function boundsOf(range) {
    const text = String(range || '');
    const versionPattern = /(\^|~|>=|<=|>|<|=)?\s*v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g;
    let min = null;
    let max = null;
    let match;
    while ((match = versionPattern.exec(text))) {
      const operator = match[1] || '=';
      const version = match[2];
      if (operator === '>=' || operator === '>' || operator === '^' || operator === '~' || operator === '=' || !match[1]) {
        if (!min || compareVersions(version, min) === -1) min = version;
      }
      if (operator === '<=' || operator === '<') {
        if (!max || compareVersions(version, max) === 1) max = version;
      }
    }
    return { min, max };
  }

  function compatibility(manifest, runtime) {
    const dsh = manifest.dsh || {};
    const hasBundle = Boolean(dsh.bundle);
    const hasClient = Boolean(dsh.client);
    const requirement = manifest.engines && manifest.engines.dsh ? String(manifest.engines.dsh) : null;
    const base = {
      requirement,
      runtime,
      bundle: hasBundle,
      client: hasClient,
      platform: dsh.client && dsh.client.platform ? String(dsh.client.platform) : null
    };
    if (!hasBundle) return { ...base, compatible: false, reason: 'not-a-dsh-bundle', direction: 'not-bundle' };
    if (!requirement) return { ...base, compatible: null, reason: 'no-version-declared', direction: 'undeclared' };
    if (!runtime) return { ...base, compatible: null, reason: 'runtime-unknown', direction: 'unknown' };
    const ok = satisfies(runtime, requirement);
    let direction = 'ok';
    let reason = 'satisfied';
    if (ok === false) {
      reason = 'range-mismatch';
      const bounds = boundsOf(requirement);
      if (bounds.min && compareVersions(runtime, bounds.min) === -1) direction = 'below-min';
      else if (bounds.max && compareVersions(runtime, bounds.max) === 1) direction = 'above-max';
      else direction = 'mismatch';
    } else if (ok === null) {
      reason = 'unreadable-range';
      direction = 'unreadable';
    }
    return { ...base, compatible: ok, reason, direction };
  }

  function cleanReadme(text) {
    let body = String(text || '');
    body = body.replace(/```[\s\S]*?```/g, ' ');
    body = body.replace(/<[^>]*>/g, ' ');
    body = body.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
    body = body.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    body = body.replace(/^\s*#{1,6}\s*/gm, '');
    const lines = body
      .split(/\r?\n/)
      .map((line) => line.replace(/[`*_|]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((line) => line.length >= 2 && !/^[\W_]+$/.test(line));
    const picked = [];
    let total = 0;
    for (const line of lines) {
      if (!picked.length && /^(badge|build|coverage|tests?|npm|license|version|downloads?)\b/i.test(line) && line.length < 60) {
        continue;
      }
      picked.push(line);
      total += line.length;
      if (total >= 650) break;
    }
    return picked.join('\n').slice(0, 900).trim();
  }

  async function fetchJson(url, timeout = 12000) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`registry ${response.status}`);
    return response.json();
  }

  async function fetchReadme(name, version) {
    const mirrors = [
      `https://unpkg.com/${name}@${version}/README.md`,
      `https://cdn.jsdelivr.net/npm/${name}@${version}/README.md`
    ];
    for (const url of mirrors) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
        if (!response.ok) continue;
        const cleaned = cleanReadme(await response.text());
        if (cleaned) return cleaned;
      } catch {
        /* try the next mirror */
      }
    }
    return '';
  }

  function searchIndex(query, category, sort, limit) {
    const source = snapshot && Array.isArray(snapshot.index) ? snapshot.index : [];
    let items = source;
    if (query) items = items.filter((entry) => matches(entry, query));
    if (category && category !== 'all') items = items.filter((entry) => entry.category === category);
    const sorted = items.slice().sort((a, b) => {
      if (sort === 'downloads') return b.downloads - a.downloads;
      if (sort === 'stars') return b.stars - a.stars;
      if (sort === 'new') return (Date.parse(b.added) || 0) - (Date.parse(a.added) || 0);
      return b.heat - a.heat;
    });
    return { total: items.length, items: sorted.slice(0, limit) };
  }

  function matches(entry, query) {
    const needle = String(query || '').toLowerCase();
    return [entry.name, entry.title, entry.owner, entry.descriptionEn, entry.descriptionZh].some(
      (field) => field && String(field).toLowerCase().includes(needle)
    );
  }

  function publicSnapshot(installed) {
    if (!snapshot) {
      return { version: 1, ready: false, writeToken: WRITE_TOKEN, refreshing, error: refreshError, refreshHour: REFRESH_HOUR };
    }
    const installedMap = new Map();
    for (const bundle of installed) {
      if (bundle && bundle.name) installedMap.set(bundle.name, bundle);
    }
    const decorate = (entry) => {
      // The catalog's recommended spec can differ from the listing name
      // (for example dsh-market installs dshmarket), so match both.
      const bundle = installedMap.get(entry.name) || (entry.spec ? installedMap.get(entry.spec) : undefined);
      return {
        ...entry,
        installed: Boolean(bundle && bundle.installed),
        installedVersion: bundle && bundle.version ? bundle.version : null
      };
    };
    const byName = new Map(snapshot.entries.map((entry) => [entry.name, entry]));
    const featured = (snapshot.featured || [])
      .map((name) => byName.get(name))
      .filter(Boolean)
      .map(decorate);
    const leaderboard = (snapshot.leaderboard || [])
      .map((row) => {
        const entry = byName.get(row.name);
        return entry ? decorate({ ...entry, rank: row.rank }) : null;
      })
      .filter(Boolean);

    const rising = snapshot.entries
      .filter((entry) => typeof entry.delta === 'number' && entry.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 6)
      .map(decorate);

    return {
      version: 1,
      ready: true,
      writeToken: WRITE_TOKEN,
      generatedAt: snapshot.generatedAt,
      generatedDay: snapshot.generatedDay,
      nextRefreshAt: nextRefreshLabel(),
      refreshHour: REFRESH_HOUR,
      refreshing,
      error: refreshError || snapshot.lastError || null,
      source: 'awesome-dsh-plugin.com',
      catalogTotal: snapshot.catalogTotal,
      accepted: snapshot.accepted,
      categories: snapshot.categories,
      featured,
      leaderboard,
      rising,
      entries: snapshot.entries.map(decorate),
      installed: installed
        .filter((bundle) => bundle && bundle.installed)
        .map((bundle) => ({
          name: bundle.name,
          version: bundle.version || null,
          enabled: Boolean(bundle.enabled),
          title: plainTitle(bundle.meta && bundle.meta.title)
        }))
    };
  }

  ctx.effect(() => {
    const id = setInterval(() => {
      if (shouldRefresh(snapshot, new Date())) refresh();
    }, TICK_MS);
    if (id && typeof id.unref === 'function') id.unref();
    return () => clearInterval(id);
  });

  ctx.effect(() => {
    const timer = setTimeout(() => {
      if (shouldRefresh(snapshot, new Date())) refresh();
    }, 1500);
    if (timer && typeof timer.unref === 'function') timer.unref();
    return () => clearTimeout(timer);
  });

  ctx.effect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const [key, task] of installs) {
        if (now - task.startedAt > INSTALL_TTL_MS) installs.delete(key);
      }
    }, 5 * 60 * 1000);
    if (id && typeof id.unref === 'function') id.unref();
    return () => clearInterval(id);
  });

  // Let agents answer "which plugin should I install?" from the same curated
  // index the panel uses. dsh-market has no model-facing tool, so this is one
  // place where the featured market can be genuinely more useful than bigger
  // catalogs: the recommendation carries curated copy and a ready command.
  const tools = get('tools');
  if (tools && typeof tools.register === 'function') {
    try {
      ctx.effect(() =>
        tools.register({
          name: 'featured_market_search',
          description:
            'Search the Featured Plugin Market: the full accepted index of DeepSeek Harness plugins with bilingual descriptions, a heat score (downloads + stars + freshness), and an install command. Every result includes the install command. Featured entries are hand-checked; other descriptions are machine translated. Use whenever the user asks for a DSH plugin, extension, tool, theme, or a recommendation, or asks what a plugin does.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Keyword in English or Chinese, e.g. "memory", "记忆", "theme", "voice".'
              },
              category: {
                type: 'string',
                description: 'Optional category id such as ui, theme, tools, ai, data, or dev.'
              },
              limit: {
                type: 'integer',
                minimum: 1,
                maximum: 8,
                description: 'Number of results to return (default 5).'
              }
            },
            required: ['query'],
            additionalProperties: false
          },
          output: {
            schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
            render(args, value) {
              return [{ type: 'text', text: String((value && value.text) || '') }];
            }
          },
          timeoutMs: 20000,
          isConcurrencySafe: () => true,
          async execute(args) {
            const query = String((args && args.query) || '').trim();
            const category = String((args && args.category) || 'all').trim();
            const limit = Math.min(8, Math.max(1, Number(args && args.limit) || 5));
            if (!query) return { text: '请提供搜索关键词（query）。' };
            const { total, items } = searchIndex(query, category, 'heat', limit);
            if (!total) return { text: `精选市场里没有找到与「${query}」匹配的插件。换个关键词，或去掉分类过滤再试。` };
            const installed = await bundles();
            const byBundle = new Map(installed.map((bundle) => [bundle.name, bundle]));
            const lines = [`精选插件市场 · 「${query}」共 ${total} 个匹配，按热度取前 ${items.length} 个：`, ''];
            items.forEach((entry, index) => {
              const bundle = byBundle.get(entry.name) || (entry.spec ? byBundle.get(entry.spec) : undefined);
              const description = clip(entry.descriptionZh || entry.descriptionEn || '');
              const spec = entry.spec || entry.name;
              const categoryLabel = CATEGORY_LABELS[entry.category] || entry.category;
              const installedLabel =
                bundle && bundle.installed ? ` · 已安装 ${bundle.version || ''}`.trimEnd() : '';
              lines.push(`${index + 1}. ${entry.title || entry.name}（${entry.name}）`);
              lines.push(
                `   热度 ${entry.heat} · ↓ ${entry.downloads} · ★ ${entry.stars} · ${categoryLabel}${installedLabel}`
              );
              if (description) lines.push(`   ${description}`);
              lines.push(`   安装：dsh plugin add ${spec}`);
              lines.push('');
            });
            lines.push('安装前请先征得用户同意；安装后按提示重启 DSH 一次即可生效。');
            return { text: lines.join('\n').trim() };
          }
        })
      );
    } catch {
      /* tool registration is optional; the panel does not depend on it */
    }
  }

  // Routes are mounted through ctx.inject so a cold start waits for the
  // browser carrier instead of silently skipping registration.
  const readIndexSourceState = () => {
    try {
      const raw = JSON.parse(fs.readFileSync(INDEX_SOURCE_PATH, 'utf8'));
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  };

  const writeIndexSourceState = (value) => {
    try {
      fs.mkdirSync(path.dirname(INDEX_SOURCE_PATH), { recursive: true });
      fs.writeFileSync(INDEX_SOURCE_PATH, JSON.stringify({ ...readIndexSourceState(), ...value }));
    } catch {
      /* a state file failure only costs one extra offer next boot */
    }
  };

  const indexSourceService = () => {
    const market = get('pluginMarket');
    if (!market || typeof market.listIndexes !== 'function' || typeof market.setIndexes !== 'function') return null;
    return market;
  };

  const configuredIndexUrls = async (market) => {
    const list = await market.listIndexes();
    return (Array.isArray(list) ? list : [])
      .map((item) => (typeof item === 'string' ? item : item && item.url))
      .filter((url) => typeof url === 'string' && url);
  };

  const indexSourceStatus = async () => {
    const market = indexSourceService();
    if (!market) return { available: false, added: false, url: INDEX_SOURCE_URL };
    try {
      const urls = await configuredIndexUrls(market);
      return { available: true, added: urls.includes(INDEX_SOURCE_URL), url: INDEX_SOURCE_URL };
    } catch {
      return { available: false, added: false, url: INDEX_SOURCE_URL };
    }
  };

  const ensureIndexSource = async ({ force = false } = {}) => {
    const market = indexSourceService();
    if (!market) return { status: 'unavailable', url: INDEX_SOURCE_URL };
    try {
      const urls = await configuredIndexUrls(market);
      if (urls.includes(INDEX_SOURCE_URL)) {
        writeIndexSourceState({ added: true, addedAt: new Date().toISOString() });
        return { status: 'present', url: INDEX_SOURCE_URL };
      }
      // The user deleted the source on purpose: offer it again only when the
      // panel button asks explicitly.
      if (!force && readIndexSourceState().added) return { status: 'skipped', url: INDEX_SOURCE_URL };
      await market.setIndexes([...urls, INDEX_SOURCE_URL]);
      writeIndexSourceState({ added: true, addedAt: new Date().toISOString() });
      return { status: 'added', url: INDEX_SOURCE_URL };
    } catch (error) {
      return {
        status: 'failed',
        url: INDEX_SOURCE_URL,
        message: error && error.message ? error.message : String(error)
      };
    }
  };

  const mountRoutes = (webServer, effect) => {
  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(body));
  };

  const readBody = (request) =>
    new Promise((resolve) => {
      const chunks = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          resolve({});
        }
      });
      request.on('error', () => resolve({}));
    });

  // All mutating routes require the per-process token that only the same-origin
  // client can read from the snapshot. This blocks CSRF from other pages that
  // can reach localhost; the token is not a substitute for OS-level isolation.

  // Every route is an exact registration on the bare webServer, so it never
  // passed through the host's own fence and browser login. Ask the host's
  // connection service for the verdict it would give its own API: a status
  // code refuses the request, undefined admits it. A host that publishes no
  // gate is treated as refusing rather than as open.
  const admissionRejection = (request) => {
    const connection = ctx.get('connection');
    const gate = connection && connection.requestRejection;
    if (typeof gate !== 'function') return 503;
    try {
      const rejection = gate.call(connection, request);
      return typeof rejection === 'number' ? rejection : undefined;
    } catch {
      return 503;
    }
  };

  const admit = (request, response) => {
    const rejection = admissionRejection(request);
    if (rejection) {
      send(response, rejection, { error: 'unadmitted' });
      return false;
    }
    return true;
  };

  const authorizeWrite = (request, response) => {
    const token = request.headers['x-featured-market-token'];
    if (typeof token !== 'string' || token !== WRITE_TOKEN) {
      send(response, 403, { error: 'forbidden' });
      return false;
    }
    const site = request.headers['sec-fetch-site'];
    if (site && site !== 'same-origin' && site !== 'none') {
      send(response, 403, { error: 'forbidden' });
      return false;
    }
    const origin = request.headers.origin;
    if (origin && typeof webServer.getOrigin === 'function') {
      try {
        if (new URL(origin).origin !== new URL(webServer.getOrigin()).origin) {
          send(response, 403, { error: 'forbidden' });
          return false;
        }
      } catch {
        send(response, 403, { error: 'forbidden' });
        return false;
      }
    }
    return true;
  };


  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/projects',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        const url = new URL(request.url || '/', 'http://localhost');
        if (request.method === 'GET') {
          const force = url.searchParams.get('force') === '1';
          for (const project of projectItems) {
            const data = await readProject(project, force);
            Object.assign(project, data);
          }
          saveProjects();
          send(response, 200, {
            items: projectItems.map(publicProject),
            updatedAt: new Date().toISOString()
          });
          return;
        }
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const repo = String((body && body.repo) || '').trim();
        const npmName = String((body && body.npm) || '').trim();
        if (repo && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
          return send(response, 400, { error: 'invalid-repo' });
        }
        if (npmName && !/^(@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+$/.test(npmName)) {
          return send(response, 400, { error: 'invalid-npm' });
        }
        if (!repo && !npmName) return send(response, 400, { error: 'invalid-project' });
        if (projectItems.length >= MAX_PROJECTS) return send(response, 400, { error: 'too-many-projects' });
        const id = repo || npmName;
        if (projectItems.some((item) => item.id === id || (repo && item.repo === repo) || (npmName && item.npm === npmName))) {
          return send(response, 409, { error: 'already-tracked' });
        }
        const item = {
          id,
          title: String((body && body.title) || '').trim().slice(0, 80) || repo || npmName,
          repo: repo || null,
          npm: npmName || null,
          addedAt: new Date().toISOString(),
          lastSeenFeedbackAt: new Date().toISOString(),
          history: []
        };
        const data = await readProject(item, true);
        if (repo && data.error && /github 404/.test(data.error)) {
          return send(response, 404, { error: 'repo-not-found' });
        }
        Object.assign(item, data);
        projectItems.push(item);
        saveProjects();
        send(response, 200, { item: publicProject(item) });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/projects/refresh',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const id = String((body && body.id) || '');
        const targets = id ? projectItems.filter((item) => item.id === id) : projectItems;
        if (!targets.length) return send(response, 404, { error: 'not-found' });
        for (const project of targets) {
          const data = await readProject(project, true);
          Object.assign(project, data);
        }
        saveProjects();
        send(response, 200, { items: projectItems.map(publicProject), updatedAt: new Date().toISOString() });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/projects/seen',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const id = String((body && body.id) || '');
        const project = projectItems.find((item) => item.id === id);
        if (!project) return send(response, 404, { error: 'not-found' });
        project.lastSeenFeedbackAt = new Date().toISOString();
        project.unread = 0;
        saveProjects();
        send(response, 200, { ok: true });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/projects/remove',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const id = String((body && body.id) || '');
        const before = projectItems.length;
        projectItems = projectItems.filter((item) => item.id !== id);
        if (projectItems.length === before) return send(response, 404, { error: 'not-found' });
        projectCache.delete(id);
        saveProjects();
        send(response, 200, { ok: true });
      }
    })
  );

  // Lightweight liveness probe. It answers even while the catalog snapshot is
  // still being read, so a cold start can be distinguished from a dead route.
  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/health',
      handler: (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        send(response, 200, {
          ok: true,
          ready: Boolean(snapshot && snapshot.entries),
          entries: snapshot && Array.isArray(snapshot.entries) ? snapshot.entries.length : 0,
          refreshing
        });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/snapshot',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        send(response, 200, publicSnapshot(await bundles()));
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/refresh',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        await refresh();
        send(response, 200, publicSnapshot(await bundles()));
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/search',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        const url = new URL(request.url || '/', 'http://localhost');
        const query = (url.searchParams.get('q') || '').trim().toLowerCase();
        const category = url.searchParams.get('category') || 'all';
        const sort = url.searchParams.get('sort') || 'heat';
        const limit = Math.min(60, Math.max(1, Number(url.searchParams.get('limit')) || 40));
        const { total, items } = searchIndex(query, category, sort, limit);
        const installed = await bundles();
        const byBundle = new Map(installed.map((bundle) => [bundle.name, bundle]));
        const decorated = items.map((entry) => {
          const bundle = byBundle.get(entry.name) || (entry.spec ? byBundle.get(entry.spec) : undefined);
          return {
            ...entry,
            installed: Boolean(bundle && bundle.installed),
            installedVersion: bundle && bundle.version ? bundle.version : null
          };
        });
        send(response, 200, { total, items: decorated });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/plugin',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        const url = new URL(request.url || '/', 'http://localhost');
        const name = (url.searchParams.get('name') || '').trim();
        if (!name) return send(response, 400, { error: 'invalid-name' });
        const entry =
          snapshot && Array.isArray(snapshot.index) ? snapshot.index.find((item) => item.name === name) : null;
        if (!entry) return send(response, 404, { error: 'not-listed' });

        const cached = manifestCache.get(name);
        if (cached && Date.now() - cached.at < MANIFEST_TTL_MS) return send(response, 200, cached.data);

        try {
          const latest = await fetchJson(`https://registry.npmjs.org/${name}/latest`);
          const runtime = await runtimeVersion();
          const compat = compatibility(latest || {}, runtime);
          let readmeEn = '';
          let readmeZh = null;
          try {
            readmeEn = await fetchReadme(name, latest.version || 'latest');
            if (readmeEn) readmeZh = await translateText(readmeEn.slice(0, 700), 'zh-CN');
          } catch {
            /* the README is optional: compatibility still renders */
          }
          const repository =
            typeof latest.repository === 'string'
              ? latest.repository
              : latest.repository && latest.repository.url
                ? String(latest.repository.url)
                : null;
          const data = {
            name,
            version: latest.version || null,
            description: latest.description || null,
            deprecated: latest.deprecated || null,
            license: latest.license || null,
            homepage: latest.homepage || null,
            repository,
            unpackedSize:
              latest.dist && typeof latest.dist.unpackedSize === 'number' ? latest.dist.unpackedSize : null,
            compatibility: compat,
            readme: { en: readmeEn || null, zh: readmeZh || null }
          };
          manifestCache.set(name, { at: Date.now(), data });
          if (manifestCache.size > 80) manifestCache.delete(manifestCache.keys().next().value);
          send(response, 200, data);
        } catch (error) {
          send(response, 502, {
            error: 'manifest-unavailable',
            detail: error && error.message ? error.message : String(error)
          });
        }
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/skills',
      handler: (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, { error: 'method-not-allowed' });
        try {
          const items = readSkills();
          send(response, 200, { ok: true, count: items.length, items, scanned: SKILL_DIRS });
        } catch (error) {
          send(response, 500, { ok: false, error: error && error.message ? error.message : 'skills-unavailable' });
        }
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/bundles',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        const installed = await bundles();
        send(response, 200, {
          items: installed.map((bundle) => ({
            name: bundle.name,
            version: bundle.version || null,
            enabled: Boolean(bundle.enabled),
            installed: Boolean(bundle.installed),
            official: Boolean(bundle.official),
            title: plainTitle(bundle.meta && bundle.meta.title),
            description: bundle.description || undefined
          }))
        });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/toggle',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const name = String((body && body.name) || '');
        if (!name) return send(response, 400, { error: 'invalid-name' });
        const pluginManager = get('pluginManager');
        if (!pluginManager || typeof pluginManager.setBundleEnabled !== 'function') {
          return send(response, 503, { error: 'manager-unavailable' });
        }
        try {
          const result = await pluginManager.setBundleEnabled(name, Boolean(body.enabled));
          send(response, 200, {
            name,
            enabled: Boolean(body.enabled),
            changed: Boolean(result && result.changed),
            application: result && result.application,
            error: result && result.error ? result.error.code : null
          });
        } catch (error) {
          send(response, 500, { error: error && error.message ? error.message : 'toggle-failed' });
        }
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/updates',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        const url = new URL(request.url || '/', 'http://localhost');
        const force = url.searchParams.get('force') === '1';
        send(response, 200, await collectUpdates(force));
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/update',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const name = String((body && body.name) || '');
        const version = String((body && body.version) || '');
        if (!name || !version) return send(response, 400, { error: 'invalid-request' });
        const pluginManager = get('pluginManager');
        if (!pluginManager || typeof pluginManager.updateBundle !== 'function') {
          return send(response, 503, { error: 'manager-unavailable' });
        }
        try {
          const result = await pluginManager.updateBundle(name, version);
          invalidateUpdates();
          send(response, 200, {
            name,
            version,
            from: result && result.from,
            to: result && result.to,
            step: result && result.step,
            application: result && result.result ? result.result.application : undefined,
            error: result && result.result && result.result.error ? result.result.error.code : null
          });
        } catch (error) {
          send(response, 500, { error: error && error.message ? error.message : 'update-failed' });
        }
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/remove',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const body = await readBody(request);
        const name = String((body && body.name) || '');
        if (!name) return send(response, 400, { error: 'invalid-name' });
        const pluginManager = get('pluginManager');
        if (!pluginManager || typeof pluginManager.removeBundle !== 'function') {
          return send(response, 503, { error: 'manager-unavailable' });
        }
        try {
          const result = await pluginManager.removeBundle(name);
          invalidateUpdates();
          send(response, 200, {
            name,
            changed: Boolean(result && result.changed),
            application: result && result.application,
            error: result && result.error ? result.error.code : null
          });
        } catch (error) {
          send(response, 500, { error: error && error.message ? error.message : 'remove-failed' });
        }
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/source',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method === 'GET') return send(response, 200, await indexSourceStatus());
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;
        const result = await ensureIndexSource({ force: true });
        const status = result.status === 'added' || result.status === 'present' ? 200 : 502;
        send(response, status, { ...(await indexSourceStatus()), result: result.status, message: result.message || null });
      }
    })
  );

  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/install',
      handler: async (request, response) => {
        if (!admit(request, response)) return;
        if (request.method === 'GET') {
          const url = new URL(request.url || '/', 'http://localhost');
          const id = url.searchParams.get('id') || '';
          const task = installs.get(id);
          if (!task) return send(response, 404, { status: 'unknown' });
          return send(response, 200, {
            id: task.id,
            name: task.name,
            status: task.status,
            result: task.result
              ? {
                  changed: task.result.changed,
                  application: task.result.application,
                  restartReason: task.result.restartReason || null,
                  error: task.result.error || null,
                  warnings: task.result.warnings || []
                }
              : null,
            error: task.error
          });
        }
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
        if (!authorizeWrite(request, response)) return;

        const body = await readBody(request);
        const name = cleanName(body && body.name);
        if (!name) return send(response, 400, { error: 'invalid-name' });

        const pluginManager = get('pluginManager');
        if (!pluginManager || typeof pluginManager.installBundle !== 'function') {
          return send(response, 503, { error: 'manager-unavailable' });
        }

        const entry = snapshot && snapshot.entries.find((item) => item.name === name);
        if (!entry) return send(response, 404, { error: 'not-listed' });
        const spec = entry.spec || name;

        const id = `fm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const task = {
          id,
          name,
          spec,
          status: 'running',
          startedAt: Date.now(),
          result: null,
          error: null
        };
        installs.set(id, task);

        Promise.resolve()
          .then(() => pluginManager.installBundle(spec, { requestId: id }))
          .then((result) => {
            task.result = result;
            task.status = result && result.application === 'failed' ? 'failed' : 'done';
            invalidateUpdates();
          })
          .catch((error) => {
            task.status = 'failed';
            invalidateUpdates();
            task.error = error && error.message ? error.message : String(error);
          });

        send(response, 200, { id, name, status: 'running' });
      }
    })
  );

  };

  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (sub) => {
      const server = sub && sub.webServer;
      if (server && typeof server.register === 'function') {
        mountRoutes(server, (callback, name) => sub.effect(callback, name));
      }
    });
  } else {
    const server = get('webServer');
    if (server && typeof server.register === 'function') {
      mountRoutes(server, ctx.effect.bind(ctx));
    }
  }
}
