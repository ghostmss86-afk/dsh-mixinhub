# dsh-featured-market

**A curated plugin market for DeepSeek Harness.** It answers one question in
about 30 seconds: *which plugin should I install, and how do I actually use it?*

[![Version](https://img.shields.io/badge/version-1.5.0-2f6f5e)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/DSH-web%20client-4b5563)](https://github.com/deepseek-ai/deepseek-harness)
[![Topic](https://img.shields.io/badge/topic-dsh--plugin-c0392b)](https://github.com/topics/dsh-plugin)

[中文说明](#中文说明) · [Install](#install) · [What you get](#what-you-get) ·
[How curation works](#how-curation-works) · [FAQ](#faq)

**Version:** `1.5.0`

---

## Why this exists

Plugin directories are good at listing everything. They are bad at helping you
decide. A list of 9,000 packages with download counts still leaves you asking:
*Is this compatible? What does it actually do? Will it break my setup?*

This plugin takes the opposite approach:

- **Curated, not exhaustive.** A quality gate removes abandoned, undescribed and
  non-bundle packages before they reach the main lists.
- **Bilingual by default.** Every curated plugin has a Chinese and an English
  description, so you can scan in the language you think in.
- **Install with context.** Compatibility, package size, README summary and the
  exact install command sit next to the install button — not three pages away.
- **Decision tools, not dashboards.** Compare two or three candidates, read a
  plain-language heat explanation, and keep a private shortlist.

It is intentionally smaller than a full plugin manager. It does not try to
replace your package manager, edit your profile, or back up your environment.

## Install

Requires DeepSeek Harness **0.2.x** and the web client.

### From GitHub (available now)

```bash
dsh plugin add github:ghostmss86-afk/dsh-featured-market
```

### From npm

Published as `dsh-featured-market`:

```bash
dsh plugin add dsh-featured-market
```

The GitHub and release-tarball paths above remain available.

Then reload the Harness window. The storefront button appears in the lower-left
sidebar, next to **Skins & Wallpapers** (`皮肤和壁纸`).

## What you get

| Area | What it does |
|---|---|
| **Featured** | Up to 14 editorially ordered picks, at most two per category. |
| **Heat leaderboard** | Top 30 by a transparent score, with seven-day trend and “rising today”. |
| **Search** | Full-text search over the curated index, with category filter and four sort modes. |
| **Detail page** | Bilingual description, “what it can do”, four-step usage, compatibility, README summary, source links, install command. |
| **Compare** | Put 2–3 plugins side by side across nine decision rows. |
| **Compatibility** | Directional advice from the package's own `engines.dsh` range, not a guessed yes/no. |
| **Notes** | A private note per plugin (up to 500 characters). |
| **Import / export** | Move favorites and notes as one JSON file. |
| **Installed** | Enable, disable, update and uninstall installed plugins; the market never disables itself. |
| **Update alerts** | Background check every five minutes; a sidebar dot appears when updates exist, with one-click **Update all**. |
| **Agent tool** | `featured_market_search` lets an Agent search the same index in conversation. |

All UI copy is available in Chinese and English. The language switch is stored
locally.

## The 30-second workflow

1. Open the storefront from the lower-left sidebar.
2. Scan **Featured** or the **Heat leaderboard**.
3. Select up to three candidates and press **Compare**.
4. Check the compatibility row and the README summary.
5. Copy the install command, or press **Get**.

## How curation works

The catalog is fetched from the public Awesome DSH Plugin index and rebuilt
locally once a day at **04:00 local time**.

At the time of writing, the pipeline looks like this:

| Stage | Rule |
|---|---|
| Source | ~9,400 catalog entries |
| Accepted | ~2,100 npm packages that declare a DSH bundle, have a real description, and clear a minimum download/star bar |
| Searchable | All accepted entries |
| Main lists | Top 220 by heat |
| Featured | 14 picks, at most 2 per category |
| Leaderboard | Top 30, with trend |

**Heat score** = 52% log-scaled downloads + 33% log-scaled stars + 15% freshness
(240-day decay). Log scaling stops one huge package from flattening the rest;
freshness keeps new work visible. The same explanation is available in the UI,
so the number is never a black box.

Curation rules and weights may change between versions; the README and the
in-app explanation are updated together.

## Compatibility advice

Compatibility is computed from the package manifest and the running Harness
version:

| Advice | Meaning |
|---|---|
| `ok` | The declared range includes your Harness version. |
| `below-min` | Your Harness is older than the package's minimum. |
| `above-max` | The package declares an upper bound and your Harness is above it. |
| `mismatch` | The declared range exists but excludes your version. |
| `undeclared` | The author did not declare `engines.dsh`. This is a warning, not a failure. |
| `not-bundle` | The package is not a DSH bundle. |
| `unknown` | The running Harness version could not be determined. |
| `unreadable` | The declared range could not be parsed. |

The advice is intentionally directional: an undeclared range is common and is
not treated the same as a confirmed mismatch.

## Agent tool

```json
{ "query": "memory", "limit": 3 }
```

`featured_market_search` returns Markdown with the plugin name, heat, downloads,
stars, category, bilingual description and install command. It is read-only and
uses the local snapshot; installing still requires your confirmation.

## Privacy and permissions

- The market runs on your local Harness host. It does not send telemetry.
- Network requests go only to: the public catalog, the npm registry, unpkg or
  jsDelivr (README), and Google Translate / MyMemory (translation fallback).
- No account, cloud sync or analytics service is involved.
- Local storage keys: `dsh.featured-market.lang`,
  `dsh.featured-market.favorites`, `dsh.featured-market.notes`.

## How it compares

| | This market | A full plugin manager |
|---|---|---|
| Primary job | Decide what to install | Manage everything installed |
| Catalog | Curated, quality-gated | Broad, exhaustive |
| Bilingual copy | First-class | Usually optional |
| Comparison | 2–3 plugins, nine rows | Rare |
| Compatibility | Directional advice | Often yes/no |
| Backups / cloud sync | No (by design) | Often yes |
| Failure surface | Small | Larger |

Neither approach is wrong. This one is for people who want a short, trustworthy
shortlist and a clean install path.

## FAQ

**Does it install plugins for me?**
It shows the exact command and, for npm packages, can call the Harness plugin
manager after you confirm. It never installs silently.

**Why does the leaderboard change daily?**
Downloads, stars and freshness move. The refresh runs at 04:00 local time; you
can also trigger it manually from the panel.

**Does it work offline?**
The last snapshot stays readable, but search, install and compatibility need the
network.

**Is my shortlist uploaded?**
No. Favorites and notes live in local storage. Export is a local file download.

**Why do some plugins have no compatibility result?**
The author did not declare `engines.dsh`. The UI labels this as undeclared
instead of pretending it is incompatible.

**Is this a replacement for `dsh-market`?**
No. It is a lighter, decision-first layer. See [How it compares](#how-it-compares).

## Development

```bash
# syntax + documentation checks
npm run check

# inspect what would be published
npm run pack:check

# package contents
npm pack --dry-run
```

Layout:

```
index.js          host: refresh, routes, install/update/remove/toggle, Agent tool
client.js         sidebar entry, market panel, detail, compare, favorites, notes
lib/market.js     catalog fetch, snapshot building, heat and curation
lib/semver.js     version range parsing and matching
lib/translate.js  translation fallback (Google → MyMemory)
data/             bilingual seed translations
locale/           plugin metadata (zh / en)
scripts/          release and documentation checks
```

Host reload during development: toggle the plugin off and on in the plugin
manager, then refresh the Harness window. Client-only changes need a page
refresh.

## Release and README policy

Every release must update **three** places:

1. the `version` in `package.json`,
2. the `**Version:**` line and any changed behavior in this README,
3. a new entry in [CHANGELOG.md](CHANGELOG.md).

`npm run check` fails when the README version or changelog entry is missing, so
the documentation cannot silently drift from the code. CI runs the same check on
every push and pull request.

## Contributing

Issues and pull requests are welcome. For catalog corrections, include the
plugin name and the evidence (npm page or repository). For behavior changes,
describe the decision the user is trying to make, not only the feature.

## License

[MIT](LICENSE) © 2026 ghostmss86-afk

Not affiliated with DeepSeek. DeepSeek Harness is a separate project.

---

## 中文说明

**一句话：30 秒内决定该装哪个插件，并且知道装完怎么用。**

这是一个给 DeepSeek Harness 用的精选插件市场，入口在左下角「皮肤和壁纸」旁边。

### 它解决什么问题

插件目录擅长「列全」，不擅长「帮你选」。面对九千多个包和一堆下载量，你仍然
不知道：它兼容吗？到底能做什么？会不会把我的环境搞坏？

这个插件反着做：

- **精选，而不是全量堆砌。** 先过质量门槛，再进入主列表。
- **默认双语。** 每个精选插件都有中英文说明。
- **带着上下文安装。** 兼容性、包大小、README 摘要和安装命令就在按钮旁边。
- **给决策工具，不给仪表盘。** 2–3 款并排对比、看得懂的热度解释、私有清单。

### 安装

```bash
# 从 GitHub（现在可用）
dsh plugin add github:ghostmss86-afk/dsh-featured-market
```

已发布到 npm，包名 `dsh-featured-market`：

```bash
dsh plugin add dsh-featured-market
```

上面的 GitHub 与 Release tarball 方式同样可用。

安装后刷新 Harness 窗口，点左下角商店图标即可。

### 主要功能

- 精选推荐：最多 14 个，每个分类最多 2 个。
- 热度榜：前 30 名，含 7 日趋势与「今日飙升」。
- 全量检索：按分类筛选，支持热度 / 下载 / 星标 / 最新排序。
- 详情页：双语说明、「它能做什么」、四步用法、兼容性、README 摘要、来源链接。
- 并排对比：2–3 款，九个决策维度。
- 方向性兼容建议：区分「环境太旧」「超过上限」「未声明」「不兼容」。
- 备注与清单导入导出：数据只存在本机。
- 已安装管理：启用、停用、更新、卸载；不会停用自己。
- 更新提醒：每 5 分钟自动检查，有更新时侧栏出现圆点，已安装页可一键全部更新。
- Agent 工具：`featured_market_search`，在对话里直接搜。

### 精选规则（会随版本调整）

- 数据来自公开目录，每天本地时间 04:00 重建。
- 只保留声明了 DSH bundle、描述完整、达到下载/星标门槛的 npm 包。
- 热度 = 52% 对数下载 + 33% 对数星标 + 15% 新鲜度（240 天衰减）。
- 主列表最多 220 个；精选 14 个；热度榜 30 个。

### 兼容性说明

读取插件自己的 `engines.dsh` 范围，再和当前 Harness 版本比较，给出方向性建议。
作者没写范围时标为「未声明」，只提示、不判死刑。

### 隐私

不埋点、不上传收藏和备注、不需要账号。网络请求只到公开目录、npm registry、
unpkg/jsDelivr（README）和翻译服务。收藏与备注存在浏览器 localStorage。

### 边界

不做云备份、评论区、截图墙、诊断修复和崩溃恢复。那些是重型管理器的职责；
这里只负责「选得准、说得清、装得对」。

### 版本与文档

每次发版都会同步更新本 README 的版本号、变更说明和
[CHANGELOG.md](CHANGELOG.md)。`npm run check` 会在版本号或变更记录缺失时直接
失败，CI 也会跑同样的检查，避免文档和代码脱节。

MIT License © 2026 ghostmss86-afk
