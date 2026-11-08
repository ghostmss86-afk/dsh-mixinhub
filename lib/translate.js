/**
 * Small, dependency-free translation chain used by the daily refresh.
 *
 * The market ships a seed of reviewed Chinese text, so this only runs for
 * plugins the seed does not know yet. Two keyless endpoints are tried in
 * order; any failure degrades to "no translation" and the caller keeps the
 * original text instead of blocking the refresh.
 */
const GOOGLE = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY = 'https://api.mymemory.translated.net/get';
const TIMEOUT_MS = 9000;

function withTimeout(promiseFactory, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return promiseFactory(controller.signal).finally(() => clearTimeout(timer));
}

async function google(text, target, signal) {
  const url = `${GOOGLE}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`google ${response.status}`);
  const payload = await response.json();
  const parts = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
  const translated = parts
    .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
    .join('')
    .trim();
  if (!translated) throw new Error('google empty');
  return translated;
}

async function mymemory(text, target, signal) {
  const pair = target.toLowerCase().startsWith('zh') ? 'en|zh-CN' : 'zh-CN|en';
  const url = `${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`mymemory ${response.status}`);
  const payload = await response.json();
  const translated = payload && payload.responseData && payload.responseData.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) throw new Error('mymemory empty');
  if (/QUERY LENGTH LIMIT|MYMEMORY WARNING/i.test(translated)) throw new Error('mymemory limit');
  return translated.trim();
}

export async function translateText(text, target) {
  const source = String(text || '').trim();
  if (!source) return null;
  const shortened = source.length > 900 ? `${source.slice(0, 900)}…` : source;
  const providers = [google, mymemory];
  for (const provider of providers) {
    try {
      const result = await withTimeout((signal) => provider(shortened, target, signal), TIMEOUT_MS);
      if (result && result.toLowerCase() !== source.toLowerCase()) return result;
    } catch {
      /* try the next provider */
    }
  }
  return null;
}
