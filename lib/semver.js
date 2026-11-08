/**
 * Minimal semver comparison for the compatibility line.
 *
 * Only what a plugin manifest's `engines.dsh` uses in practice: comparators,
 * caret/tilde ranges, `||`, wildcards and prerelease tags. Anything it cannot
 * parse returns null so the UI can say "unknown" instead of guessing.
 */
function parse(value) {
  const text = String(value || '').trim().replace(/^v/, '');
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split('.') : []
  };
}

function comparePre(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;
  if (!b.length) return -1;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNumber = /^\d+$/.test(left);
    const rightNumber = /^\d+$/.test(right);
    if (leftNumber && rightNumber) {
      const diff = Number(left) - Number(right);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    } else if (leftNumber) {
      return -1;
    } else if (rightNumber) {
      return 1;
    } else if (left !== right) {
      return left > right ? 1 : -1;
    }
  }
  return 0;
}

export function compareVersions(left, right) {
  const a = typeof left === 'string' ? parse(left) : left;
  const b = typeof right === 'string' ? parse(right) : right;
  if (!a || !b) return null;
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  return comparePre(a.pre, b.pre);
}

function upperFor(target, operator) {
  if (operator === '^') {
    if (target.major > 0) return { major: target.major + 1, minor: 0, patch: 0, pre: ['0'] };
    if (target.minor > 0) return { major: 0, minor: target.minor + 1, patch: 0, pre: ['0'] };
    return { major: 0, minor: 0, patch: target.patch + 1, pre: ['0'] };
  }
  return { major: target.major, minor: target.minor + 1, patch: 0, pre: ['0'] };
}

export function satisfies(version, range) {
  const current = parse(version);
  const text = String(range || '').trim();
  if (!current || !text) return null;
  for (const alternative of text.split('||')) {
    const parts = alternative.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    let valid = true;
    for (const part of parts) {
      const match = /^(>=|<=|>|<|=|\^|~)?\s*(.+)$/.exec(part);
      if (!match) {
        valid = false;
        break;
      }
      const operator = match[1] || '=';
      const raw = match[2].trim();
      if (/^[*xX]$/.test(raw)) continue;
      const target = parse(raw);
      if (!target) {
        valid = false;
        break;
      }
      const diff = compareVersions(current, target);
      if (diff === null) {
        valid = false;
        break;
      }
      if (operator === '>=' && diff < 0) valid = false;
      else if (operator === '>' && diff <= 0) valid = false;
      else if (operator === '<=' && diff > 0) valid = false;
      else if (operator === '<' && diff >= 0) valid = false;
      else if (operator === '=' && diff !== 0) valid = false;
      else if (operator === '^' || operator === '~') {
        const upper = upperFor(target, operator);
        if (diff < 0 || compareVersions(current, upper) >= 0) valid = false;
      }
      if (!valid) break;
    }
    if (valid) return true;
  }
  return false;
}
