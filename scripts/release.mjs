#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

const type = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('usage: npm run release -- <patch|minor|major> ["release note"]');
  process.exit(1);
}
const note = process.argv.slice(3).join(' ').trim();

if (out('git', ['status', '--porcelain'])) {
  console.error('working tree is not clean; commit or stash first');
  process.exit(1);
}
if (out('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') {
  console.error('release from the main branch');
  process.exit(1);
}

run('npm', ['version', type, '--no-git-tag-version']);
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const date = new Date().toISOString().slice(0, 10);

let readme = readFileSync('README.md', 'utf8');
readme = readme.replace(/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-/, `badge/version-${version}-`);
readme = readme.replace(/\*\*Version:\*\* `[^`]+`/, `**Version:** \`${version}\``);
readme = readme.replace(/\| Version \| `[^`]+` \|/, `| Version | \`${version}\` |`);
writeFileSync('README.md', readme);

let llms = readFileSync('llms.txt', 'utf8');
llms = llms.replace(/^Version: .*$/m, `Version: ${version}`);
writeFileSync('llms.txt', llms);
copyFileSync('llms.txt', 'docs/llms.txt');

let changelog = readFileSync('CHANGELOG.md', 'utf8');
if (!changelog.includes(`## [${version}]`)) {
  const entry = `## [${version}] - ${date}\n\n### Changed\n\n- ${note || `Release ${version}.`}\n\n`;
  changelog = changelog.replace(/\n## \[/, `\n${entry}## [`);
  writeFileSync('CHANGELOG.md', changelog);
}

run('npm', ['run', 'check']);
run('git', ['add', '-A']);
run('git', ['commit', '-m', `chore(release): v${version}`]);
run('git', ['tag', `v${version}`]);
run('git', ['push', 'origin', 'main']);
run('git', ['push', 'origin', `v${version}`]);
console.log(`\nreleased v${version}: GitHub Actions will build the release and publish to npm (when NPM_TOKEN is set).`);
