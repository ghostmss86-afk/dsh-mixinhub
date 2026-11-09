#!/usr/bin/env node
/**
 * Render the three long-form static pages from docs-src/*.md with the
 * Guizang Page skill.
 *
 * The skill lives in the user's DSH profile; set GZ_PAGE_SKILL to override the
 * path (for example on another machine). This script is run locally by
 * `npm run release`, not in CI: CI only verifies that the rendered output is
 * committed and that docs-src/changelog.md has a section for the new version.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_SKILL =
  '/Users/apple/.dsh/profiles/desktop/node_modules/dsh-guizang-design/skills/guizang-page-skill';
const skillDir = process.env.GZ_PAGE_SKILL || DEFAULT_SKILL;
const render = path.join(skillDir, 'scripts', 'render.mjs');

if (!existsSync(render)) {
  console.error(
    `Guizang Page skill not found at ${render}\n` +
      'Set GZ_PAGE_SKILL to the skill directory, or render the pages manually.'
  );
  process.exit(1);
}

const pages = [
  ['about', 'magazine', 'ink-classic'],
  ['guide', 'magazine', 'indigo-porcelain'],
  ['changelog', 'magazine', 'midnight-ink'],
];

for (const [name, style, theme] of pages) {
  const source = path.join('docs-src', `${name}.md`);
  const annotations = path.join('docs-src', `${name}.annotations.json`);
  const output = path.join('docs', `${name}.html`);
  execFileSync(
    process.execPath,
    [render, source, annotations, output, '--style', style, '--theme', theme],
    { stdio: 'inherit' }
  );
}

console.log('\nbuild:docs — three pages rendered.');
