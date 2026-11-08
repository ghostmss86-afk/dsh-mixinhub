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
import { translateText } from './lib/translate.js';
import { compareVersions, satisfies } from './lib/semver.js';

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

  async function fillTranslations(next) {
    const pending = next.entries
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

    const current = new Set(next.entries.map((entry) => entry.name));
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
      return { version: 1, ready: false, refreshing, error: refreshError, refreshHour: REFRESH_HOUR };
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
          title: bundle.meta && bundle.meta.title ? bundle.meta.title : undefined
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
  // catalogs: the recommendation carries reviewed copy and a ready command.
  const tools = get('tools');
  if (tools && typeof tools.register === 'function') {
    try {
      ctx.effect(() =>
        tools.register({
          name: 'featured_market_search',
          description:
            'Search the Featured Plugin Market: a curated index of 2,100+ DeepSeek Harness plugins with reviewed Chinese and English descriptions, a heat score (downloads + stars + freshness), and an install command. Use whenever the user asks for a DSH plugin, extension, tool, theme, or a recommendation, or asks what a plugin does.',
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

  // Lightweight liveness probe. It answers even while the catalog snapshot is
  // still being read, so a cold start can be distinguished from a dead route.
  effect(() =>
    webServer.register({
      kind: 'exact',
      path: '/featured-market/health',
      handler: (request, response) => {
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
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
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
      path: '/featured-market/bundles',
      handler: async (request, response) => {
        if (request.method !== 'GET') return send(response, 405, { error: 'method-not-allowed' });
        const installed = await bundles();
        send(response, 200, {
          items: installed.map((bundle) => ({
            name: bundle.name,
            version: bundle.version || null,
            enabled: Boolean(bundle.enabled),
            installed: Boolean(bundle.installed),
            official: Boolean(bundle.official),
            title: bundle.meta && bundle.meta.title ? bundle.meta.title : undefined,
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
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
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
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
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
        if (request.method !== 'POST') return send(response, 405, { error: 'method-not-allowed' });
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
      path: '/featured-market/install',
      handler: async (request, response) => {
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
