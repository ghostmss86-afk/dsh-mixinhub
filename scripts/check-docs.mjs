#!/usr/bin/env node
/**
 * Documentation guard for release hygiene.
 *
 * Fails when the packaged version, README and CHANGELOG disagree, so a release
 * cannot ship with stale documentation.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(root, name), 'utf8');

const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const changelog = read('CHANGELOG.md');
const version = pkg.version;

const requiredHeadings = [
  '## Quick facts',
  '## Install',
  '## Who it is for',
  '## When it fits',
  '## What you get',
  '## How curation works',
  '## Troubleshooting',
  '## Verification',
  '## FAQ',
  '## 中文说明',
];

const llms = read('llms.txt');

const checks = [
  ['package name', pkg.name === 'dsh-featured-market', pkg.name],
  ['license field', pkg.license === 'MIT', pkg.license],
  ['repository field', Boolean(pkg.repository?.url), 'missing'],
  ['README version line', readme.includes(`**Version:** \`${version}\``), version],
  ['README version badge', readme.includes(`version-${version}-`), version],
  ['CHANGELOG entry', changelog.includes(`## [${version}]`), version],
  ['llms.txt version', llms.includes(`Version: ${version}`), version],
  ['llms.txt install command', llms.includes('dsh plugin add dsh-featured-market'), 'missing'],
  ...requiredHeadings.map((heading) => [
    `README section ${heading}`,
    readme.includes(heading),
    heading,
  ]),
];

let failed = false;
for (const [label, ok, detail] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` (found: ${detail})`}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nDocumentation is out of sync. Update README.md and CHANGELOG.md together with the version.');
  process.exit(1);
}

console.log(`\nDocs are in sync for ${pkg.name}@${version}.`);
