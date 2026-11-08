window.__ModuleLoader__.load({
  id: 'dsh-featured-market',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState, useSyncExternalStore } = React;

    const API = '/featured-market';
    // Mutating routes require this per-process token. It is returned by the
    // snapshot endpoint, so only same-origin JS can read and replay it.
    let writeToken = '';
    const writeHeaders = () => ({
      'content-type': 'application/json',
      'x-featured-market-token': writeToken
    });
    const SELF_NAMES = new Set(['dsh-featured-market', '@local/featured-market']);

    const ZH = {
      'nav.label': '精选市场',
      'panel.title': '精选插件市场',
      'panel.subtitle': '编辑精选 · 一键安装 · 每日 04:00 自动更新热度',
      'panel.updated': '已刷新社区数据',
      'panel.count': '{n} 个社区插件',
      'panel.crashed': '面板加载出错，点关闭后重试',
      'panel.close': '关闭',
      'tab.featured': '精选',
      'tab.heat': '热度榜',
      'tab.installed': '已安装',

      'tab.projects': '项目看板',
      'dash.title': '我的项目',
      'dash.hint': '跟踪 GitHub 星标、npm 下载和公开反馈；每 5 分钟自动刷新。数据只存在这台设备。',
      'dash.addPlaceholder': 'owner/repo 或 npm 包名',
      'dash.add': '添加',
      'dash.adding': '添加中…',
      'dash.added': '已开始跟踪',
      'dash.exists': '已经在看板里了',
      'dash.invalid': '请输入 owner/repo 或 npm 包名',
      'dash.notFound': '找不到这个仓库或包',
      'dash.stars': '星标',
      'dash.downloads': '30 天下载',
      'dash.forks': 'Fork',
      'dash.issues': '开放 issue',
      'dash.delta': '较 7 天前',
      'dash.noHistory': '再刷新几次就有趋势了',
      'dash.feedback': '最新反馈',
      'dash.noFeedback': '暂无公开反馈。有人开 issue 时会在这里出现。',
      'dash.unread': '{n} 条新反馈',
      'dash.markSeen': '全部已读',
      'dash.marked': '已标记为已读',
      'dash.refresh': '刷新',
      'dash.refreshing': '刷新中…',
      'dash.remove': '移除',
      'dash.confirmRemove': '再点一次移除',
      'dash.removed': '已从看板移除',
      'dash.openRepo': '打开仓库',
      'dash.updated': '更新于 {time}',
      'dash.failed': '项目数据暂时不可用',
      'dash.empty': '还没有项目',
      'dash.comments': '{n} 条评论',
      'dash.listed': '已收录 #{rank}',
      'dash.unlisted': '未进精选目录',
      'dash.limit': '最多跟踪 12 个项目',
      'tab.favorites': '收藏',
      'section.favorites': '我的收藏',
      'favorites.count': '已收藏 {n} 个',
      'empty.favorites': '还没有收藏。打开任意插件详情，点右上角星标即可收藏。',
      'favorite.add': '收藏',
      'favorite.remove': '取消收藏',
      'update.check': '检查更新',
      'update.checking': '检查中…',
      'update.none': '所有插件都是最新版本',
      'update.available': '有 {n} 个插件可以更新',
      'update.to': '可更新',
      'update.run': '更新',
      'update.done': '更新完成',
      'update.failed': '更新失败',
      'update.all': '全部更新 ({n})',
      'update.allRunning': '正在更新 {done}/{total}…',
      'update.allDone': '已更新 {n} 个插件',
      'update.badgeTitle': '{n} 个插件可更新',
      'update.checked': '上次检查 {time}',
      'remove.action': '卸载',
      'remove.confirm': '确认卸载',
      'remove.done': '已卸载',
      'remove.failed': '卸载失败',


      'search.placeholder': '搜索插件、作者或功能',
      'hero.pick': '今日编辑精选',
      'action.get': '获取',
      'action.installing': '安装中',
      'action.installed': '已安装',
      'action.unavailable': '不可安装',
      'action.refresh': '刷新数据',
      'action.close': '关闭',
      'action.retry': '重试',
      'detail.back': '返回',
      'detail.about': '简介',
      'detail.more': '详情',
      'detail.capability': '它能做什么',
      'detail.usage': '怎么用',
      'detail.copy': '复制',
      'detail.copied': '已复制',
      'detail.links': '链接',
      'detail.page': '插件主页',
      'detail.npm': 'npm 页面',
      'detail.author': '作者',
      'detail.originalEn': 'English',
      'detail.originalZh': '中文',
      'detail.installNote': '安装只写入当前 profile；提示重启时重启一次 DSH 即可生效。',
      'detail.noTranslation': '暂无翻译，以下为原文',
      'detail.compat': '兼容性与来源',
      'detail.compatChecking': '正在检查兼容性…',
      'detail.compatUnknown': '暂时无法读取 npm 清单，安装前请查看插件主页。',
      'detail.compatRequires': '要求 DSH',
      'detail.compatRuntime': '当前 DSH',
      'detail.compatNone': '未声明',
      'detail.compatYes': '兼容当前版本',
      'detail.compatNo': '与当前版本不兼容',
      'detail.compatUndeclared': '作者未声明版本范围',
      'detail.compatUnreadable': '无法解析作者声明的版本范围',
      'detail.advice.belowMin': '需要更新的 DSH：当前 {runtime}，要求 {requirement}。升级 DSH 后再安装。',
      'detail.advice.aboveMax': '作者声明的上限是 {requirement}，当前 {runtime} 更新；通常仍可用，建议先备份配置。',
      'detail.advice.mismatch': '版本范围不匹配；安装前请查看作者说明。',
      'detail.advice.undeclared': '作者没有声明版本范围；安装前请查看 README 与最近更新时间。',
      'detail.advice.notBundle': '这个 npm 包不是 DSH 插件包（缺少 dsh.bundle），装进 DSH 不会生效。',
      'detail.advice.unknown': '暂时读不到你的 DSH 版本；请确认当前版本与作者要求。',
      'heat.title': '热度怎么算',
      'heat.body': '热度 = 52% 下载（对数）+ 33% 星标（对数）+ 15% 新鲜度（240 天衰减）。每天 04:00 重算；它衡量长期受欢迎程度，不是今天的新品速度。',
      'heat.parts': '下载 {downloads} · 星标 {stars} · 收录 {added}',
      'compare.add': '对比',
      'compare.added': '已选',
      'compare.bar': '已选 {n}/3',
      'compare.start': '开始对比',
      'compare.clear': '清空',
      'compare.title': '并排对比',
      'compare.hint': '选 2–3 个插件，逐项比较兼容性、热度和安装成本。',
      'compare.limit': '最多同时对比 3 个',
      'compare.remove': '移除',
      'compare.row.heat': '热度',
      'compare.row.downloads': '下载',
      'compare.row.stars': '星标',
      'compare.row.category': '分类',
      'compare.row.compat': '兼容性',
      'compare.row.size': '安装包',
      'compare.row.added': '收录时间',
      'compare.row.desc': '一句话说明',
      'compare.row.command': '安装命令',
      'compare.loading': '读取中…',
      'compare.empty': '还没有选择插件',
      'detail.notBundle': '不是 DSH 插件包',
      'detail.readme': '官方说明摘要',
      'detail.readmeNote': '摘自 npm 上的 README，中文为机器翻译，仅供参考。',
      'detail.repo': '代码仓库',
      'detail.size': '安装包',
      'note.title': '我的备注',
      'note.placeholder': '写一句「我为什么装它」，只保存在这台设备上。',
      'note.saved': '自动保存 · 仅本机可见',
      'backup.export': '导出清单',
      'backup.import': '导入清单',
      'backup.exported': '清单已导出',
      'backup.imported': '已导入，新增 {n} 个收藏',
      'backup.failed': '导入失败：不是有效的清单文件',
      'step.install': '点击「获取」安装；也可以复制下面的命令在终端执行。',
      'step.restart': '安装完成后如果提示重启，重启一次 DSH。',
      'step.config': '需要填写密钥或账号的插件，在「设置 → 插件」里完成配置。',
      'step.open.ui': '重启后在外观、侧边栏或「设置」里找到它的入口。',
      'step.open.workflow': '在会话中通过命令、面板或自动流程使用，具体入口见插件主页。',
      'step.open.tools': '安装后作为工具被 Agent 调用，或在侧边栏、设置中打开面板。',
      'step.open.connect': '先到「设置」完成账号、机器人或密钥授权，再在会话中使用。',
      'step.open.model': '在「设置」中填入模型服务或密钥后启用。',
      'step.open.dev': '安装后按插件主页说明配置，多数会自动生效。',
      'step.open.data': '打开侧边栏或设置中的面板查看统计。',
      'step.open.fun': '安装后重启，在界面角落或输入框附近找它。',
      'step.open.market': '安装后从「设置」的市场入口打开。',
      'cap.ui': '改变界面外观，增加面板、侧边栏或快捷入口。',
      'cap.workflow': '改变会话流程、上下文管理或自动化方式。',
      'cap.tools': '给 Agent 增加新的工具或执行能力。',
      'cap.connect': '把 DSH 接到聊天软件、远程设备或通知渠道。',
      'cap.model': '接入模型服务，或增加记忆与知识能力。',
      'cap.dev': '开发、调试、代码审查与安全防护。',
      'cap.data': '统计用量、费用、余额与配额。',
      'cap.fun': '增加趣味互动，不影响正常工作。',
      'cap.market': '浏览、安装和管理其他插件。',

      'stat.downloads': '30 日下载',
      'stat.stars': 'GitHub 星标',
      'stat.heat': '热度',
      'badge.loved': '口碑爆棚',
      'badge.starred': '社区高星',
      'badge.new': '新晋热门',
      'badge.hot': '热度飙升',
      'section.featured': '编辑推荐',
      'section.featuredDesc': '综合下载、星标与新鲜度筛选，每类最多两款',
      'section.category': '分类',
      'section.heat': '社区热度榜',
      'section.heatDesc': '热度 = 下载 52% + 星标 33% + 新鲜度 15%，每天 04:00 自动重算',
      'section.installed': '已安装的插件',
      'section.rising': '今日飙升',
      'sort.label': '排序',
      'sort.heat': '按热度',
      'sort.downloads': '按下载',
      'sort.stars': '按星标',
      'sort.new': '最新收录',
      'search.results': '搜索结果',
      'installed.count': '共 {n} 个已安装',
      'installed.notListed': '未收录在本期精选',
      'toggle.on': '已启用，点击停用',
      'toggle.off': '已停用，点击启用',
      'toggle.done': '启用状态已更新',
      'toggle.failed': '切换失败',
      'toggle.self': '市场自身不能在这里停用',

      'empty.category': '这个分类暂时没有达到收录标准的插件',
      'empty.search': '没有找到匹配的插件',
      'empty.installed': '还没有从精选市场安装插件',
      'error.title': '市场数据暂时不可用',
      'error.hint': '检查网络后重试；已缓存的数据仍会继续显示。',
      'loading': '正在同步社区数据…',
      'refreshing': '正在刷新…',
      'footer.source': '数据来源',
      'footer.catalog': '社区插件',
      'footer.accepted': '达到收录标准',
      'footer.next': '下次自动更新',
      'footer.stale': '上次同步失败，展示缓存数据',
      'footer.updated': '热度更新于',
      'install.ok': '安装完成',
      'install.restart': '安装完成，重启后生效',
      'install.failed': '安装失败',
      'delta.new': '新上榜',
      'cat.all': '全部',
      'cat.ui': '界面与主题',
      'cat.workflow': '会话与自动化',
      'cat.tools': '工具与能力',
      'cat.connect': '连接与通知',
      'cat.model': '模型与记忆',
      'cat.dev': '开发与安全',
      'cat.data': '用量与计费',
      'cat.fun': '趣味',
      'cat.market': '市场与管理',
      'unit.downloads': '下载',
      'unit.stars': '星标'
    };

    const EN = {
      'nav.label': 'Featured',
      'panel.title': 'Featured plugins',
      'panel.subtitle': 'Editor picks · one-click install · heat refreshed daily at 04:00',
      'panel.updated': 'Community data refreshed',
      'panel.count': '{n} community plugins',
      'panel.crashed': 'This panel hit an error. Close and retry.',
      'panel.close': 'Close',
      'tab.featured': 'Featured',
      'tab.heat': 'Leaderboard',
      'tab.installed': 'Installed',

      'tab.projects': 'Dashboard',
      'dash.title': 'My projects',
      'dash.hint': 'Track GitHub stars, npm downloads and public feedback; refreshed every 5 minutes. Stored on this device only.',
      'dash.addPlaceholder': 'owner/repo or npm package',
      'dash.add': 'Add',
      'dash.adding': 'Adding…',
      'dash.added': 'Now tracking',
      'dash.exists': 'Already on the dashboard',
      'dash.invalid': 'Enter owner/repo or an npm package name',
      'dash.notFound': 'Repository or package not found',
      'dash.stars': 'Stars',
      'dash.downloads': '30-day downloads',
      'dash.forks': 'Forks',
      'dash.issues': 'Open issues',
      'dash.delta': 'vs 7 days ago',
      'dash.noHistory': 'Refresh a few more times to see a trend',
      'dash.feedback': 'Latest feedback',
      'dash.noFeedback': 'No public feedback yet. New issues will show up here.',
      'dash.unread': '{n} new',
      'dash.markSeen': 'Mark all read',
      'dash.marked': 'Marked as read',
      'dash.refresh': 'Refresh',
      'dash.refreshing': 'Refreshing…',
      'dash.remove': 'Remove',
      'dash.confirmRemove': 'Click again to remove',
      'dash.removed': 'Removed from dashboard',
      'dash.openRepo': 'Open repository',
      'dash.updated': 'Updated {time}',
      'dash.failed': 'Project data is temporarily unavailable',
      'dash.empty': 'No projects yet',
      'dash.comments': '{n} comments',
      'dash.listed': 'Listed #{rank}',
      'dash.unlisted': 'Not in the curated index',
      'dash.limit': 'Track up to 12 projects',
      'tab.favorites': 'Saved',
      'section.favorites': 'Saved plugins',
      'favorites.count': '{n} saved',
      'empty.favorites': 'Nothing saved yet. Open a plugin and tap the star to keep it here.',
      'favorite.add': 'Save',
      'favorite.remove': 'Remove',
      'update.check': 'Check updates',
      'update.checking': 'Checking…',
      'update.none': 'Everything is up to date',
      'update.available': '{n} plugins can be updated',
      'update.to': 'Update to',
      'update.run': 'Update',
      'update.done': 'Updated',
      'update.failed': 'Update failed',
      'update.all': 'Update all ({n})',
      'update.allRunning': 'Updating {done}/{total}…',
      'update.allDone': 'Updated {n} plugins',
      'update.badgeTitle': '{n} plugins can update',
      'update.checked': 'Last checked {time}',
      'remove.action': 'Remove',
      'remove.confirm': 'Confirm',
      'remove.done': 'Removed',
      'remove.failed': 'Remove failed',


      'search.placeholder': 'Search plugins, authors or features',
      'hero.pick': "Today's editor pick",
      'action.get': 'Get',
      'action.installing': 'Installing',
      'action.installed': 'Installed',
      'action.unavailable': 'Unavailable',
      'action.refresh': 'Refresh data',
      'action.close': 'Close',
      'action.retry': 'Retry',
      'detail.back': 'Back',
      'detail.about': 'About',
      'detail.more': 'Details',
      'detail.capability': 'What it does',
      'detail.usage': 'How to use',
      'detail.copy': 'Copy',
      'detail.copied': 'Copied',
      'detail.links': 'Links',
      'detail.page': 'Plugin page',
      'detail.npm': 'npm page',
      'detail.author': 'Author',
      'detail.originalEn': 'English',
      'detail.originalZh': 'Chinese',
      'detail.installNote': 'Installs into the current profile only; restart DSH once when asked.',
      'detail.noTranslation': 'No translation yet; showing the original text',
      'detail.compat': 'Compatibility & source',
      'detail.compatChecking': 'Checking compatibility…',
      'detail.compatUnknown': 'Could not read the npm manifest; check the plugin page before installing.',
      'detail.compatRequires': 'Requires DSH',
      'detail.compatRuntime': 'Current DSH',
      'detail.compatNone': 'not declared',
      'detail.compatYes': 'Compatible',
      'detail.compatNo': 'Incompatible with this version',
      'detail.compatUndeclared': 'No version range declared',
      'detail.compatUnreadable': 'The declared version range cannot be parsed',
      'detail.advice.belowMin': 'Needs a newer DSH: you have {runtime}, it requires {requirement}. Update DSH first.',
      'detail.advice.aboveMax': 'The author capped support at {requirement}; you have {runtime}. It usually still works, but back up your configuration first.',
      'detail.advice.mismatch': 'The version range does not match; read the author notes before installing.',
      'detail.advice.undeclared': 'No DSH version range is declared; check the README and last update first.',
      'detail.advice.notBundle': 'This npm package is not a DSH bundle (no dsh.bundle), so it will not load in DSH.',
      'detail.advice.unknown': 'Could not read your DSH version; check it against the author requirement.',
      'heat.title': 'How heat works',
      'heat.body': 'Heat = 52% downloads (log) + 33% stars (log) + 15% freshness (240-day decay). Recomputed daily at 04:00; it measures lasting popularity, not how new a plugin is.',
      'heat.parts': '{downloads} downloads · {stars} stars · added {added}',
      'compare.add': 'Compare',
      'compare.added': 'Selected',
      'compare.bar': '{n}/3 selected',
      'compare.start': 'Compare side by side',
      'compare.clear': 'Clear',
      'compare.title': 'Side-by-side comparison',
      'compare.hint': 'Pick 2–3 plugins and compare compatibility, heat, and install cost row by row.',
      'compare.limit': 'Compare up to 3 at a time',
      'compare.remove': 'Remove',
      'compare.row.heat': 'Heat',
      'compare.row.downloads': 'Downloads',
      'compare.row.stars': 'Stars',
      'compare.row.category': 'Category',
      'compare.row.compat': 'Compatibility',
      'compare.row.size': 'Package',
      'compare.row.added': 'Added',
      'compare.row.desc': 'One-line summary',
      'compare.row.command': 'Install command',
      'compare.loading': 'Reading…',
      'compare.empty': 'Nothing selected yet',
      'detail.notBundle': 'Not a DSH bundle',
      'detail.readme': 'From the official README',
      'detail.readmeNote': 'Excerpted from the npm README; Chinese is machine-translated for reference.',
      'detail.repo': 'Repository',
      'detail.size': 'Package',
      'note.title': 'My note',
      'note.placeholder': 'Why did you install this? Stored only on this device.',
      'note.saved': 'Saved automatically · private to this device',
      'backup.export': 'Export',
      'backup.import': 'Import',
      'backup.exported': 'List exported',
      'backup.imported': 'Imported, {n} new saved plugins',
      'backup.failed': 'Import failed: not a valid list file',
      'step.install': 'Click Get to install, or copy the command below and run it in a terminal.',
      'step.restart': 'If DSH asks to restart, restart it once after the install finishes.',
      'step.config': 'Plugins that need keys or accounts are configured under Settings → Plugins.',
      'step.open.ui': 'After restarting, find it under appearance, the sidebar, or Settings.',
      'step.open.workflow': 'Use it through a command, a panel, or an automated flow; see its page for the exact entry.',
      'step.open.tools': 'It becomes a tool the agent can call, or opens a panel in the sidebar or Settings.',
      'step.open.connect': 'Authorize the account, bot, or key under Settings first, then use it in a session.',
      'step.open.model': 'Fill in the model service or key under Settings, then enable it.',
      'step.open.dev': 'Configure it as described on its page; most take effect automatically.',
      'step.open.data': 'Open its panel in the sidebar or Settings to see the numbers.',
      'step.open.fun': 'Restart after installing; look for it near a corner of the UI or the composer.',
      'step.open.market': 'Open it from the market entry in Settings after installing.',
      'cap.ui': 'Changes how the interface looks, and adds panels, sidebar entries, or shortcuts.',
      'cap.workflow': 'Changes how sessions flow, how context is managed, or how work is automated.',
      'cap.tools': 'Gives the agent new tools or execution capabilities.',
      'cap.connect': 'Connects DSH to chat apps, remote devices, or notification channels.',
      'cap.model': 'Adds model providers, memory, or knowledge capabilities.',
      'cap.dev': 'Development, debugging, code review, and safety guards.',
      'cap.data': 'Tracks usage, cost, balance, and quotas.',
      'cap.fun': 'Adds playful interactions without getting in the way.',
      'cap.market': 'Browses, installs, and manages other plugins.',

      'stat.downloads': '30-day downloads',
      'stat.stars': 'GitHub stars',
      'stat.heat': 'Heat',
      'badge.loved': 'Loved',
      'badge.starred': 'High stars',
      'badge.new': 'New & hot',
      'badge.hot': 'Trending',
      'section.featured': 'Editor picks',
      'section.featuredDesc': 'Selected for downloads, stars and freshness, at most two per category',
      'section.category': 'Categories',
      'section.heat': 'Community heat',
      'section.heatDesc': 'Heat = 52% downloads + 33% stars + 15% freshness, recomputed daily at 04:00',
      'section.installed': 'Installed plugins',
      'section.rising': 'Rising today',
      'sort.label': 'Sort',
      'sort.heat': 'By heat',
      'sort.downloads': 'By downloads',
      'sort.stars': 'By stars',
      'sort.new': 'Newest',
      'search.results': 'Search results',
      'installed.count': '{n} installed',
      'installed.notListed': 'Not in this market',
      'toggle.on': 'Enabled, click to disable',
      'toggle.off': 'Disabled, click to enable',
      'toggle.done': 'Enablement updated',
      'toggle.failed': 'Toggle failed',
      'toggle.self': 'The market cannot disable itself here',

      'empty.category': 'No plugin in this category meets the curation bar yet',
      'empty.search': 'No plugin matches this search',
      'empty.installed': 'No plugin from this market is installed yet',
      'error.title': 'Market data is unavailable',
      'error.hint': 'Check the network and retry; cached data keeps showing meanwhile.',
      'loading': 'Syncing community data…',
      'refreshing': 'Refreshing…',
      'footer.source': 'Source',
      'footer.catalog': 'Community plugins',
      'footer.accepted': 'Meet the curation bar',
      'footer.next': 'Next auto update',
      'footer.stale': 'Last sync failed, showing cached data',
      'footer.updated': 'Heat updated',
      'install.ok': 'Installed',
      'install.restart': 'Installed, effective after restart',
      'install.failed': 'Install failed',
      'delta.new': 'NEW',
      'cat.all': 'All',
      'cat.ui': 'Interface & theme',
      'cat.workflow': 'Sessions & automation',
      'cat.tools': 'Tools & capabilities',
      'cat.connect': 'Connect & notify',
      'cat.model': 'Models & memory',
      'cat.dev': 'Development & security',
      'cat.data': 'Usage & billing',
      'cat.fun': 'Fun',
      'cat.market': 'Market & management',
      'unit.downloads': 'downloads',
      'unit.stars': 'stars'
    };

    // ---------- tiny open/close bus between the footer action and the overlay ----------

    // A module instance can be replaced by HMR while the old footer button is
    // still mounted. Keep the open state on the page, not on this instance, so
    // the visible button and the live overlay always share one bus.
    const bus = (() => {
      const key = '__dshFeaturedMarketOpenBus';
      try {
        if (globalThis[key] && globalThis[key].listeners instanceof Set) return globalThis[key];
        const created = { open: false, listeners: new Set() };
        globalThis[key] = created;
        return created;
      } catch {
        return { open: false, listeners: new Set() };
      }
    })();
    function setOpen(next) {
      if (bus.open === next) return;
      bus.open = next;
      bus.listeners.forEach((listener) => listener());
    }
    function useOpen() {
      return useSyncExternalStore(
        (listener) => {
          bus.listeners.add(listener);
          return () => {
            bus.listeners.delete(listener);
          };
        },
        () => bus.open,
        () => bus.open
      );
    }

    // ---------- shared update state: the sidebar dot and the installed tab ----------

    const updatesBus = {
      state: { items: [], count: 0, checkedAt: null, ready: false },
      listeners: new Set(),
      inflight: null
    };

    function publishUpdates(patch) {
      updatesBus.state = { ...updatesBus.state, ...patch };
      updatesBus.listeners.forEach((listener) => listener());
    }

    function useUpdates() {
      return useSyncExternalStore(
        (listener) => {
          updatesBus.listeners.add(listener);
          return () => {
            updatesBus.listeners.delete(listener);
          };
        },
        () => updatesBus.state,
        () => updatesBus.state
      );
    }

    async function loadUpdates(force = false) {
      if (updatesBus.inflight) return updatesBus.inflight;
      updatesBus.inflight = (async () => {
        try {
          const response = await fetch(`${API}/updates${force ? '?force=1' : ''}`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const body = await response.json();
          const items = body && Array.isArray(body.items) ? body.items : [];
          const count =
            body && typeof body.count === 'number'
              ? body.count
              : items.filter((item) => item.latest && item.current && item.latest !== item.current).length;
          publishUpdates({
            items,
            count,
            checkedAt: (body && body.checkedAt) || new Date().toISOString(),
            ready: true
          });
          return updatesBus.state;
        } finally {
          updatesBus.inflight = null;
        }
      })();
      return updatesBus.inflight;
    }


    // ---------- project dashboard feed: sidebar badge + dashboard tab ----------

    const projectsBus = {
      state: { items: [], unread: 0, ready: false, updatedAt: null },
      listeners: new Set(),
      inflight: null
    };

    function publishProjects(patch) {
      projectsBus.state = { ...projectsBus.state, ...patch };
      projectsBus.listeners.forEach((listener) => listener());
    }

    function useProjectFeed() {
      return useSyncExternalStore(
        (listener) => {
          projectsBus.listeners.add(listener);
          return () => {
            projectsBus.listeners.delete(listener);
          };
        },
        () => projectsBus.state,
        () => projectsBus.state
      );
    }

    async function loadProjectsFeed(force = false) {
      if (projectsBus.inflight) return projectsBus.inflight;
      projectsBus.inflight = (async () => {
        try {
          const response = await fetch(`${API}/projects${force ? '?force=1' : ''}`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const body = await response.json();
          const items = body && Array.isArray(body.items) ? body.items : [];
          const unread = items.reduce((sum, item) => sum + (Number(item.unread) || 0), 0);
          publishProjects({ items, unread, ready: true, updatedAt: (body && body.updatedAt) || new Date().toISOString() });
          return projectsBus.state;
        } finally {
          projectsBus.inflight = null;
        }
      })();
      return projectsBus.inflight;
    }

    const LANG_KEY = 'dsh.featured-market.lang';
    const FAV_KEY = 'dsh.featured-market.favorites';
    function readLang() {
      try {
        return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh';
      } catch {
        return 'zh';
      }
    }
    function saveLang(value) {
      try {
        localStorage.setItem(LANG_KEY, value);
      } catch {
        /* private mode or blocked storage */
      }
    }

    function readFavorites() {
      try {
        const parsed = JSON.parse(localStorage.getItem(FAV_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    function writeFavorites(map) {
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(map));
      } catch {
        /* storage unavailable */
      }
    }

    const NOTE_KEY = 'dsh.featured-market.notes';
    function readNotes() {
      try {
        const parsed = JSON.parse(localStorage.getItem(NOTE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    function writeNotes(map) {
      try {
        localStorage.setItem(NOTE_KEY, JSON.stringify(map));
      } catch {
        /* storage unavailable */
      }
    }

    // ---------- formatting ----------

    function compact(value) {
      const n = Number(value) || 0;
      if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
      return String(n);
    }

    function fmtBytes(value) {
      const n = Number(value) || 0;
      if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
      if (n >= 1024) return `${Math.round(n / 1024)} KB`;
      return `${n} B`;
    }

    function initialsOf(entry) {
      const source = String(entry.title || entry.name || '?');
      const words = source.split(/[\s\-_.]+/).filter(Boolean);
      if (!words.length) return '?';
      if (/[\u4e00-\u9fa5]/.test(source)) return source.slice(0, 1);
      if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    function dateLabel(iso) {
      if (!iso) return '';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${month}/${day} ${hour}:${minute}`;
    }

    // ---------- icons ----------

    function svg(props, children) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: props.size || 16,
          height: props.size || 16,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: props.weight || 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          style: { display: 'block' }
        },
        children
      );
    }

    function IconStore(props) {
      return svg(
        props,
        h(React.Fragment, null,
          h('path', { key: 'a', d: 'M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z' }),
          h('path', { key: 'b', d: 'M3 10l1.3-4.1A2 2 0 0 1 6.2 4.5h11.6a2 2 0 0 1 1.9 1.4L21 10' }),
          h('path', { key: 'c', d: 'M9.5 20v-4.5h5V20' })
        )
      );
    }

    function IconSearch(props) {
      return svg(props, h(React.Fragment, null,
        h('circle', { key: 'a', cx: 11, cy: 11, r: 6.5 }),
        h('path', { key: 'b', d: 'm16 16 4 4' })
      ));
    }

    function IconClose(props) {
      return svg(props, h(React.Fragment, null,
        h('path', { key: 'a', d: 'M6 6l12 12' }),
        h('path', { key: 'b', d: 'M18 6 6 18' })
      ));
    }

    function IconRefresh(props) {
      return svg(props, h(React.Fragment, null,
        h('path', { key: 'a', d: 'M20 11a8 8 0 1 0-2.3 6.3' }),
        h('path', { key: 'b', d: 'M20 5v6h-6' })
      ));
    }

    function IconCheck(props) {
      return svg(props, h('path', { d: 'm5 12.5 4.5 4.5L19 7.5' }));
    }

    function IconDownload(props) {
      return svg(props, h(React.Fragment, null,
        h('path', { key: 'a', d: 'M12 4v11' }),
        h('path', { key: 'b', d: 'm7.5 11 4.5 4.5L16.5 11' }),
        h('path', { key: 'c', d: 'M5 20h14' })
      ));
    }

    function IconStar(props) {
      return svg(props, h('path', {
        d: 'm12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z'
      }));
    }

    function IconStarFilled(props) {
      return svg(props, h('path', {
        d: 'm12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z',
        fill: 'currentColor'
      }));
    }

    function IconSpark(props) {
      return svg(props, h('path', { d: 'M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6z' }));
    }

    // ---------- styles ----------

    const STYLE = `
.fm-layer{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:26px;pointer-events:none;background:rgba(15,23,42,.28);backdrop-filter:blur(2px);}
.fm-backdrop{position:absolute;inset:0;background:rgba(10,12,18,.34);backdrop-filter:blur(3px);pointer-events:auto;}
.fm-panel{position:relative;display:flex;flex-direction:column;width:min(940px,100%);height:min(790px,100%);border-radius:22px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-panel,0 28px 80px rgba(0,0,0,.34));overflow:hidden;pointer-events:auto;font-size:13px;line-height:1.5;}
.fm-panel *{box-sizing:border-box;}
.fm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 12px;}
.fm-brand{display:flex;align-items:center;gap:12px;min-width:0;}
.fm-brand-icon{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;flex:none;color:#fff;background:linear-gradient(140deg,#2F6BFF,#7A3FE0 62%,#C13BD0);box-shadow:0 6px 18px rgba(70,80,220,.32);}
.fm-title{font-size:19px;font-weight:700;letter-spacing:-.01em;}
.fm-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(620px,68vw);}
.fm-head-actions{display:flex;align-items:center;gap:6px;flex:none;}
.fm-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;}
.fm-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.fm-icon-btn.is-fav{color:var(--dsw-alias-state-warn-primary);}
.fm-link-btn{padding:2px 4px;border:none;border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;}
.fm-link-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.fm-link-btn.is-danger{color:var(--dsw-alias-state-error-primary);font-weight:700;}
.fm-link-btn:disabled{opacity:.4;cursor:default;}
.fm-icon-btn.is-spinning svg{animation:fm-spin .9s linear infinite;}
@keyframes fm-spin{to{transform:rotate(360deg);}}
.fm-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 22px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);}
.fm-tabs{display:flex;align-items:center;gap:20px;}
.fm-tab{position:relative;padding:6px 0 9px;border:none;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;}
.fm-tab:hover{color:var(--dsw-alias-label-primary);}
.fm-tab.is-active{color:var(--dsw-alias-label-primary);}
.fm-tab.is-active::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary);}
.fm-search{position:relative;display:flex;align-items:center;gap:7px;height:32px;padding:0 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);width:230px;max-width:42vw;}
.fm-search input{flex:1;min-width:0;border:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none;}
.fm-search input::placeholder{color:var(--dsw-alias-label-secondary);}
.fm-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:16px 22px 22px;overscroll-behavior:contain;}
.fm-body::-webkit-scrollbar{width:10px;}
.fm-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:8px;border:3px solid transparent;background-clip:content-box;}
.fm-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:18px 0 10px;}
.fm-section-head:first-child{margin-top:2px;}
.fm-section-title{font-size:15px;font-weight:700;}
.fm-section-desc{font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.fm-hero{position:relative;display:flex;gap:18px;align-items:flex-end;min-height:196px;padding:20px;border-radius:18px;overflow:hidden;color:#fff;isolation:isolate;}
.fm-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(120% 130% at 88% -10%,rgba(255,255,255,.34),transparent 55%),linear-gradient(120deg,rgba(0,0,0,.10),rgba(0,0,0,.28));}
.fm-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 42%,rgba(0,0,0,.30));}
.fm-hero-main{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;min-width:0;flex:1;}
.fm-hero-badge{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.2);backdrop-filter:blur(6px);font-size:11px;font-weight:600;letter-spacing:.02em;}
.fm-hero-title{font-size:27px;line-height:1.15;font-weight:800;letter-spacing:-.02em;text-shadow:0 1px 2px rgba(0,0,0,.18);}
.fm-hero-author{font-size:12px;opacity:.82;}
.fm-hero-desc{font-size:12.5px;line-height:1.55;opacity:.92;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:560px;}
.fm-hero-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:2px;}
.fm-hero-stat{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;opacity:.9;}
.fm-hero-side{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex:none;}
.fm-hero-mark{position:absolute;right:-16px;top:-38px;font-size:150px;font-weight:800;line-height:1;opacity:.14;letter-spacing:-.05em;pointer-events:none;z-index:0;}
.fm-badge-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.fm-badge{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:6px;font-size:10.5px;font-weight:600;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);}
.fm-badge.is-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary);}
.fm-badge.is-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);}
.fm-badge.is-warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary);}
.fm-compat{display:flex;flex-direction:column;gap:9px;}
.fm-compat-row{display:flex;gap:10px;align-items:center;font-size:12px;flex-wrap:wrap;}
.fm-compat-label{min-width:66px;color:var(--dsw-alias-label-secondary);}
.fm-compat code{font-size:11.5px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);}
.fm-readme{white-space:pre-wrap;}
.fm-note-input{width:100%;box-sizing:border-box;resize:vertical;min-height:72px;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-primary);background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:1.6;}
.fm-note-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}
.fm-hidden-file{display:none;}
.fm-badge.on-hero{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.28);color:#fff;}
.fm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 14px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
.fm-btn:hover{background:var(--dsw-alias-bg-layer-2);}
.fm-btn:disabled{opacity:.62;cursor:default;}
.fm-btn.is-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;}
.fm-btn.is-primary:hover{filter:brightness(1.06);}
.fm-btn.is-light{background:#fff;border-color:transparent;color:#1b1d24;}
.fm-btn.is-light:hover{filter:brightness(.96);}
.fm-btn.is-done{background:transparent;border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);cursor:default;}
.fm-btn.is-small{height:27px;padding:0 12px;font-size:11.5px;}
.fm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.fm-card{display:flex;gap:11px;padding:12px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;transition:background .12s ease,border-color .12s ease;}
.fm-card:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2);}
.fm-avatar{position:relative;display:flex;align-items:center;justify-content:center;flex:none;border-radius:11px;overflow:hidden;color:#fff;font-weight:700;letter-spacing:-.02em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);}
.fm-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.fm-avatar span{position:relative;z-index:0;}
.fm-card-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;}
.fm-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.fm-card-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}
.fm-card-author{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fm-card-desc{font-size:11.5px;line-height:1.45;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:1px;}
.fm-card-meta{display:flex;align-items:center;gap:10px;margin-top:5px;font-size:10.5px;color:var(--dsw-alias-label-secondary);flex-wrap:wrap;}
.fm-meta{display:inline-flex;align-items:center;gap:3px;}
.fm-heat{display:inline-flex;align-items:center;gap:3px;font-weight:700;color:var(--dsw-alias-state-warn-primary);}
.fm-chips{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0 2px;}
.fm-chip{height:27px;padding:0 11px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;}
.fm-chip:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.fm-chip.is-active{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;}
.fm-list{display:flex;flex-direction:column;gap:2px;}
.fm-row{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:12px;min-width:0;}
.fm-row:hover{background:var(--dsw-alias-bg-layer-2);}
.fm-rank{display:flex;align-items:center;justify-content:center;width:26px;flex:none;font-size:13px;font-weight:800;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
.fm-rank.is-top{color:var(--dsw-alias-state-warn-primary);}
.fm-row-main{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}
.fm-row-name{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:650;min-width:0;}
.fm-row-name span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fm-row-desc{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fm-row-stats{display:flex;align-items:center;gap:12px;flex:none;}
.fm-delta{display:inline-flex;align-items:center;gap:2px;min-width:42px;justify-content:flex-end;font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);}
.fm-delta.is-up{color:var(--dsw-alias-state-success-primary);}
.fm-delta.is-down{color:var(--dsw-alias-state-error-primary);}
.fm-delta.is-new{color:var(--dsw-alias-state-warn-primary);}
.fm-spark{width:68px;height:22px;flex:none;color:var(--dsw-alias-brand-primary);opacity:.9;}
.fm-spark.is-flat{opacity:.25;background:currentColor;height:2px;border-radius:2px;align-self:center;}
.fm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:52px 20px;color:var(--dsw-alias-label-secondary);text-align:center;}
.fm-empty-title{font-size:13.5px;font-weight:600;color:var(--dsw-alias-label-primary);}
.fm-empty-desc{font-size:12px;max-width:380px;}
.fm-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 22px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary);}
.fm-foot-group{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.fm-foot b{font-weight:700;color:var(--dsw-alias-label-primary);}
.fm-warn{color:var(--dsw-alias-state-warn-primary);}
.fm-toast{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;max-width:80%;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 10px 30px rgba(0,0,0,.24);z-index:5;}
.fm-toast.is-error{color:var(--dsw-alias-state-error-primary);}
.fm-toast.is-ok{color:var(--dsw-alias-state-success-primary);}
.fm-skel{border-radius:14px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1));background-size:220% 100%;animation:fm-shimmer 1.2s ease-in-out infinite;}
.fm-skel-hero{height:196px;margin-bottom:10px;}
.fm-skel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.fm-skel-card{height:104px;}
@keyframes fm-shimmer{0%{background-position:120% 0;}100%{background-position:-120% 0;}}
.fm-spin{width:11px;height:11px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:fm-spin .8s linear infinite;}
@media (max-width:760px){
  .fm-layer{padding:10px;}
  .fm-panel{height:100%;border-radius:16px;}
  .fm-grid{grid-template-columns:minmax(0,1fr);}
  .fm-search{width:150px;}
  .fm-hero{min-height:170px;padding:16px;}
  .fm-hero-title{font-size:22px;}
  .fm-row-stats .fm-heat{display:none;}
}
@media (prefers-reduced-motion:no-preference){
  .fm-panel{animation:fm-pop .18s ease-out;}
  .fm-backdrop{animation:fm-fade .18s ease-out;}
}
@keyframes fm-pop{from{opacity:0;transform:translateY(8px) scale(.99);}to{opacity:1;transform:none;}}
@keyframes fm-fade{from{opacity:0;}to{opacity:1;}}
.fm-panel button:focus-visible,.fm-panel input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}
.fm-panel ::selection{background:var(--dsw-alias-brand-primary);color:#fff;}
.fm-btn.is-ghost{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.4);color:#fff;}
.fm-btn.is-ghost:hover{background:rgba(255,255,255,.22);}
.fm-lang{display:inline-flex;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);margin-right:2px;}
.fm-lang button{height:24px;padding:0 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;font-weight:700;cursor:pointer;}
.fm-lang button.is-active{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);}
.fm-card,.fm-row{cursor:pointer;}
.fm-result-tools{display:flex;align-items:center;gap:8px;}
.fm-select{height:27px;padding:0 6px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;cursor:pointer;}
.fm-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}
.fm-rising-row{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 4px;}
.fm-rise{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:4px 10px 4px 4px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;cursor:pointer;}
.fm-rise:hover{background:var(--dsw-alias-bg-layer-2);}
.fm-rise-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;font-weight:600;}
.fm-switch{position:relative;flex:none;width:34px;height:20px;padding:0;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer;transition:background .15s ease;}
.fm-switch span{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-overlay);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s ease;}
.fm-switch.is-on{background:var(--dsw-alias-brand-primary);border-color:transparent;}
.fm-switch.is-on span{transform:translateX(14px);background:#fff;}
.fm-switch:disabled{opacity:.5;cursor:default;}
.fm-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}
.fm-installed-row{cursor:default;}
.fm-detail{display:flex;flex-direction:column;gap:12px;padding-bottom:6px;}
.fm-back{align-self:flex-start;display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;}
.fm-back:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.fm-detail-head{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;}
.fm-detail-head-main{flex:1;min-width:0;}
.fm-detail-title{margin:0;font-size:22px;line-height:1.2;font-weight:800;letter-spacing:-.02em;}
.fm-detail-sub{margin-top:3px;font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;}
.fm-tags{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;}
.fm-detail-block{padding:14px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);}
.fm-block-title{margin-bottom:7px;font-size:12px;font-weight:700;color:var(--dsw-alias-label-secondary);letter-spacing:.02em;}
.fm-detail-text{margin:0;font-size:13px;line-height:1.65;}
.fm-original{margin-top:10px;padding:9px 11px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);border:1px dashed var(--dsw-alias-border-l2);}
.fm-original-label{display:inline-block;margin-bottom:4px;font-size:10.5px;font-weight:700;color:var(--dsw-alias-label-secondary);letter-spacing:.05em;text-transform:uppercase;}
.fm-original p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);}
.fm-steps{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px;font-size:12.5px;line-height:1.6;}
.fm-cmd{display:flex;align-items:center;gap:8px;margin-top:10px;padding:7px 9px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);}
.fm-cmd code{flex:1;min-width:0;overflow:auto;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;}
.fm-note{margin:8px 0 0;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
.fm-links{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;}
.fm-links a{color:var(--dsw-alias-brand-primary);text-decoration:none;font-weight:600;}
.fm-links a:hover{text-decoration:underline;}
.fm-compare{display:flex;flex-direction:column;gap:12px;padding-bottom:8px;}
.fm-compare-head{display:flex;flex-direction:column;gap:2px;}
.fm-compare-scroll{overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);}
.fm-compare-table{width:100%;border-collapse:collapse;font-size:12px;}
.fm-compare-table th,.fm-compare-table td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--dsw-alias-border-l1);}
.fm-compare-table thead th{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-overlay);}
.fm-compare-table tbody th{width:96px;font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap;background:var(--dsw-alias-bg-layer-2);}
.fm-compare-table tr:last-child th,.fm-compare-table tr:last-child td{border-bottom:none;}
.fm-compare-plugin{display:flex;align-items:center;gap:8px;min-width:150px;}
.fm-compare-plugin-main{flex:1;min-width:0;}
.fm-compare-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fm-compare-owner{font-size:10.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fm-compare-desc{display:block;line-height:1.5;color:var(--dsw-alias-label-secondary);}
.fm-compare-code{display:inline-block;max-width:230px;overflow:auto;white-space:nowrap;padding:2px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;}
.fm-compare-compat{display:flex;flex-direction:column;gap:4px;max-width:230px;}
.fm-compare-compat small{font-size:10.5px;line-height:1.45;color:var(--dsw-alias-label-secondary);}
.fm-compare-actions{display:flex;gap:6px;flex-wrap:wrap;}
.fm-compare-bar{display:flex;align-items:center;gap:10px;padding:8px 20px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);}
.fm-compare-count{font-size:11px;font-weight:700;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.fm-compare-chips{display:flex;gap:6px;overflow:auto;flex:1;min-width:0;}
.fm-compare-chip{display:inline-flex;align-items:center;gap:6px;padding:2px 8px 2px 2px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);font-size:11px;white-space:nowrap;}
.fm-chip-x{padding:0 2px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer;}
.fm-chip-x:hover{color:var(--dsw-alias-label-primary);}
.fm-compare-btn{height:20px;padding:0 7px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;font-weight:600;cursor:pointer;}
.fm-compare-btn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);}
.fm-compare-btn.is-on{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;}
.fm-heat-btn{padding:0;border:none;background:transparent;font:inherit;cursor:pointer;}
.fm-heat-q{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;background:var(--dsw-alias-bg-layer-2);font-size:9px;font-weight:700;}
.fm-heat-info{padding:12px 14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);}
.fm-heat-info strong{font-size:12px;}
.fm-heat-info p{margin:6px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);}
.fm-advice{margin:8px 0 0;padding:8px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);}
.fm-dash{display:flex;flex-direction:column;gap:14px;}
.fm-dash-add{display:flex;gap:8px;align-items:center;}
.fm-dash-add input{flex:1;min-width:0;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;}
.fm-dash-add input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;border-color:transparent;}
.fm-project-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:12px;}
.fm-project{padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:10px;min-width:0;}
.fm-project-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;}
.fm-project-title{min-width:0;}
.fm-project-name{font-size:14px;font-weight:750;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px;}
.fm-market-badge{padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:600;flex-shrink:0;}
.fm-market-badge.is-on{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);color:var(--dsw-alias-brand-primary);}
.fm-project-repo{margin-top:3px;font-size:10.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fm-project-repo a{color:var(--dsw-alias-label-secondary);text-decoration:none;}
.fm-project-repo a:hover{color:var(--dsw-alias-brand-primary);text-decoration:underline;}
.fm-project-actions{display:flex;gap:6px;flex-shrink:0;}
.fm-project-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}
.fm-metric{display:flex;flex-direction:column;gap:2px;padding:7px 8px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);min-width:0;}
.fm-metric-label{font-size:9.5px;letter-spacing:.02em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fm-metric-value{font-size:16px;font-weight:750;line-height:1.1;}
.fm-delta{align-self:flex-start;margin-top:1px;padding:1px 5px;border-radius:999px;font-size:9.5px;font-weight:700;}
.fm-delta.is-up{color:var(--dsw-alias-success, #1a7f37);background:color-mix(in srgb, var(--dsw-alias-success, #1a7f37) 14%, transparent);}
.fm-delta.is-down{color:var(--dsw-alias-error, #b42318);background:color-mix(in srgb, var(--dsw-alias-error, #b42318) 14%, transparent);}
.fm-spark{width:100%;height:40px;overflow:visible;}
.fm-spark polyline{stroke:var(--dsw-alias-brand-primary);}
.fm-dash-nohistory{font-size:10.5px;color:var(--dsw-alias-label-secondary);}
.fm-feedback-head{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:var(--dsw-alias-label-secondary);}
.fm-unread-badge{padding:1px 6px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:9.5px;font-weight:700;}
.fm-feedback-list{display:flex;flex-direction:column;gap:5px;}
.fm-feedback{display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border-radius:8px;text-decoration:none;color:inherit;background:var(--dsw-alias-bg-layer-2);}
.fm-feedback:hover{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2));}
.fm-feedback.is-unread{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-layer-2));}
.fm-feedback-dot{width:6px;height:6px;margin-top:4px;border-radius:50%;background:var(--dsw-alias-border-l1);flex-shrink:0;}
.fm-feedback.is-unread .fm-feedback-dot{background:var(--dsw-alias-brand-primary);}
.fm-feedback-main{display:flex;flex-direction:column;gap:2px;min-width:0;}
.fm-feedback-title{font-size:11.5px;font-weight:600;line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.fm-feedback-meta{font-size:9.5px;color:var(--dsw-alias-label-secondary);}
.fm-dash-empty{font-size:10.5px;line-height:1.5;color:var(--dsw-alias-label-secondary);}
.fm-dash-error{margin-top:2px;font-size:10px;color:var(--dsw-alias-error, #b42318);}

`;

    // ---------- small view pieces ----------

    function Avatar(props) {
      const entry = props.entry;
      const size = props.size || 44;
      const [failed, setFailed] = useState(false);
      const hue = Number(entry && entry.hue) || 220;
      return h(
        'div',
        {
          className: 'fm-avatar',
          style: {
            width: size,
            height: size,
            fontSize: Math.max(11, Math.round(size * 0.34)),
            background: `linear-gradient(135deg, hsl(${hue} 78% 54%), hsl(${(hue + 46) % 360} 66% 40%))`
          },
          'aria-hidden': 'true'
        },
        h('span', null, initialsOf(entry)),
        !failed && entry && entry.owner
          ? h('img', {
              src: `https://github.com/${encodeURIComponent(entry.owner)}.png?size=96`,
              alt: '',
              loading: 'lazy',
              referrerPolicy: 'no-referrer',
              onError: () => setFailed(true)
            })
          : null
      );
    }

    function Sparkline(props) {
      const trend = Array.isArray(props.trend) ? props.trend.slice() : [];
      if (!trend.length) return h('div', { className: 'fm-spark is-flat' });
      let last = null;
      const filled = trend.map((value) => {
        if (typeof value === 'number') last = value;
        return last;
      });
      if (filled.every((value) => value === null)) return h('div', { className: 'fm-spark is-flat' });
      const values = filled.map((value) => (value === null ? 0 : value));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      const width = 68;
      const height = 22;
      const step = width / Math.max(1, values.length - 1);
      const points = values.map((value, index) => {
        const x = index * step;
        const y = height - 3 - ((value - min) / span) * (height - 6);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return h(
        'svg',
        { className: 'fm-spark', viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' },
        h('polyline', {
          points: points.join(' '),
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })
      );
    }

    function Delta(props) {
      const value = props.value;
      if (value === null || value === undefined) {
        return h('span', { className: 'fm-delta is-new', title: props.t('delta.new') }, props.t('delta.new'));
      }
      if (value > 0) return h('span', { className: 'fm-delta is-up' }, `↑ ${value}`);
      if (value < 0) return h('span', { className: 'fm-delta is-down' }, `↓ ${Math.abs(value)}`);
      return h('span', { className: 'fm-delta' }, '—');
    }

    function Badges(props) {
      const badges = Array.isArray(props.badges) ? props.badges.slice(0, 2) : [];
      if (!badges.length) return null;
      return h(
        'div',
        { className: 'fm-badge-row' },
        badges.map((badge) =>
          h('span', { key: badge, className: 'fm-badge' + (props.onHero ? ' on-hero' : '') }, props.t(`badge.${badge}`))
        )
      );
    }

    function GetButton(props) {
      const entry = props.entry;
      const t = props.t;
      const job = props.job;
      const small = props.small;
      const hero = props.hero;
      const classes = ['fm-btn'];
      if (small) classes.push('is-small');
      if (hero) classes.push('is-light');
      else classes.push('is-primary');

      if (job && job.status === 'running') {
        return h(
          'button',
          { type: 'button', className: classes.join(' ') + ' is-done', disabled: true },
          h('span', { className: 'fm-spin' }),
          t('action.installing')
        );
      }
      if (entry.installed) {
        return h(
          'button',
          { type: 'button', className: 'fm-btn is-small is-done', disabled: true },
          h(IconCheck, { size: 12 }),
          t('action.installed')
        );
      }
      if (entry.installable === false) {
        return h('button', { type: 'button', className: classes.join(' ') + ' is-done', disabled: true }, t('action.unavailable'));
      }
      return h(
        'button',
        {
          type: 'button',
          className: classes.join(' '),
          onClick: (event) => {
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
            props.onInstall(entry);
          }
        },
        t('action.get')
      );
    }

    function HeroCard(props) {
      const entry = props.entry;
      const t = props.t;
      const hue = Number(entry.hue) || 220;
      return h(
        'article',
        {
          className: 'fm-hero',
          style: {
            background: `linear-gradient(122deg, hsl(${hue} 72% 42%), hsl(${(hue + 48) % 360} 64% 30%))`
          }
        },
        h('div', { className: 'fm-hero-mark', 'aria-hidden': 'true' }, initialsOf(entry)),
        h(
          'div',
          { className: 'fm-hero-main' },
          h('span', { className: 'fm-hero-badge' }, h(IconSpark, { size: 12 }), t('hero.pick')),
          h('h3', { className: 'fm-hero-title' }, entry.title),
          h('div', { className: 'fm-hero-author' }, entry.name, entry.owner ? ` · @${entry.owner}` : ''),
          h('p', { className: 'fm-hero-desc' }, props.text(entry)),
          h(
            'div',
            { className: 'fm-hero-foot' },
            h('span', { className: 'fm-hero-stat' }, h(IconDownload, { size: 13 }), `${compact(entry.downloads)} ${t('unit.downloads')}`),
            h('span', { className: 'fm-hero-stat' }, h(IconStar, { size: 13 }), `${compact(entry.stars)} ${t('unit.stars')}`),
            h('span', { className: 'fm-hero-stat' }, h(IconSpark, { size: 13 }), `${t('stat.heat')} ${entry.heat}`)
          ),
          h(Badges, { badges: entry.badges, t, onHero: true })
        ),
        h(
          'div',
          { className: 'fm-hero-side' },
          h(GetButton, { entry, t, hero: true, job: props.job, onInstall: props.onInstall }),
          h(
            'button',
            { type: 'button', className: 'fm-btn is-ghost is-small', onClick: () => props.onOpen(entry) },
            t('detail.more'),
            ' ›'
          )
        )
      );
    }

    function EntryCard(props) {
      const entry = props.entry;
      const t = props.t;
      return h(
        'article',
        {
          className: 'fm-card',
          role: 'button',
          tabIndex: 0,
          title: t('detail.more'),
          onClick: () => props.onOpen(entry),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              props.onOpen(entry);
            }
          }
        },
        h(Avatar, { entry, size: 44 }),
        h(
          'div',
          { className: 'fm-card-main' },
          h(
            'div',
            { className: 'fm-card-top' },
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { className: 'fm-card-name' }, entry.title),
              h('div', { className: 'fm-card-author' }, entry.owner ? `@${entry.owner}` : entry.name)
            ),
            h(GetButton, { entry, t, small: true, job: props.job, onInstall: props.onInstall })
          ),
          h('p', { className: 'fm-card-desc' }, props.text(entry)),
          h(
            'div',
            { className: 'fm-card-meta' },
            h('span', { className: 'fm-meta' }, h(IconDownload, { size: 11 }), compact(entry.downloads)),
            h('span', { className: 'fm-meta' }, h(IconStar, { size: 11 }), compact(entry.stars)),
            h('span', { className: 'fm-heat' }, h(IconSpark, { size: 11 }), entry.heat),
            h('span', { className: 'fm-badge' }, t(`cat.${entry.category}`)),
            h(
              'button',
              {
                type: 'button',
                className: 'fm-compare-btn' + (props.selected ? ' is-on' : ''),
                onClick: (event) => {
                  event.stopPropagation();
                  props.onCompare(entry);
                },
                onKeyDown: (event) => event.stopPropagation()
              },
              props.selected ? t('compare.added') : t('compare.add')
            )
          )
        )
      );
    }

    function RankRow(props) {
      const entry = props.entry;
      const t = props.t;
      return h(
        'div',
        {
          className: 'fm-row',
          role: 'button',
          tabIndex: 0,
          title: t('detail.more'),
          onClick: () => props.onOpen(entry),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              props.onOpen(entry);
            }
          }
        },
        h('span', { className: 'fm-rank' + (entry.rank <= 3 ? ' is-top' : '') }, entry.rank),
        h(Avatar, { entry, size: 34 }),
        h(
          'div',
          { className: 'fm-row-main' },
          h('div', { className: 'fm-row-name' }, h('span', null, entry.title), entry.badges && entry.badges.includes('new')
            ? h('span', { className: 'fm-badge' }, t('badge.new'))
            : null),
          h('div', { className: 'fm-row-desc' }, props.text(entry))
        ),
        h(
          'div',
          { className: 'fm-row-stats' },
          h(Sparkline, { trend: entry.trend }),
          h(Delta, { value: entry.rankDelta, t }),
          h('span', { className: 'fm-heat', title: t('stat.heat') }, h(IconSpark, { size: 11 }), entry.heat),
          h(
            'button',
            {
              type: 'button',
              className: 'fm-compare-btn' + (props.selected ? ' is-on' : ''),
              onClick: (event) => {
                event.stopPropagation();
                props.onCompare(entry);
              },
              onKeyDown: (event) => event.stopPropagation()
            },
            props.selected ? t('compare.added') : t('compare.add')
          ),
          h(GetButton, { entry, t, small: true, job: props.job, onInstall: props.onInstall })
        )
      );
    }

    function absoluteHref(entry) {
      const href = String(entry.href || '');
      if (!href) return '';
      if (href.startsWith('http')) return href;
      return `https://awesome-dsh-plugin.com${href.startsWith('/') ? '' : '/'}${href}`;
    }

    function DetailView(props) {
      const entry = props.entry;
      const t = props.t;
      const lang = props.lang;
      const [copied, setCopied] = useState(false);
      const command = entry.command || (entry.spec ? `dsh plugin add ${entry.spec}` : '');
      const other = lang === 'zh' ? entry.descriptionEn : entry.descriptionZh;
      const primary = props.text(entry);
      const otherLabel = lang === 'zh' ? t('detail.originalEn') : t('detail.originalZh');
      const page = absoluteHref(entry);
      const [manifest, setManifest] = useState(null);
      const [manifestReady, setManifestReady] = useState(false);
      const [noteDraft, setNoteDraft] = useState(props.note || '');
      const [heatInfo, setHeatInfo] = useState(false);

      useEffect(() => {
        setNoteDraft(props.note || '');
      }, [entry.name, props.note]);

      useEffect(() => {
        let cancelled = false;
        setManifest(null);
        setManifestReady(false);
        fetch(`${API}/plugin?name=${encodeURIComponent(entry.name)}`, { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (!cancelled) {
              setManifest(data);
              setManifestReady(true);
            }
          })
          .catch(() => {
            if (!cancelled) setManifestReady(true);
          });
        return () => {
          cancelled = true;
        };
      }, [entry.name]);

      const compat = manifest && manifest.compatibility ? manifest.compatibility : null;
      const compatState = compat
        ? compat.compatible === true
          ? 'ok'
          : compat.compatible === false
            ? 'bad'
            : ''
        : '';
      const compatLabel = compat
        ? compat.compatible === true
          ? t('detail.compatYes')
          : compat.compatible === false
            ? compat.reason === 'not-a-dsh-bundle'
              ? t('detail.notBundle')
              : t('detail.compatNo')
            : compat.reason === 'no-version-declared'
              ? t('detail.compatUndeclared')
              : compat.reason === 'unreadable-range'
                ? t('detail.compatUnreadable')
                : t('detail.compatUnknown')
        : '';
      const adviceKey = compat
        ? {
            'below-min': 'detail.advice.belowMin',
            'above-max': 'detail.advice.aboveMax',
            mismatch: 'detail.advice.mismatch',
            undeclared: 'detail.advice.undeclared',
            'not-bundle': 'detail.advice.notBundle',
            unknown: 'detail.advice.unknown'
          }[compat.direction]
        : null;
      const compatAdvice = adviceKey
        ? t(adviceKey)
            .replace('{runtime}', compat.runtime || '—')
            .replace('{requirement}', compat.requirement || '—')
        : '';

      const copy = async () => {
        if (!command) return;
        try {
          await navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      };

      return h(
        'div',
        { className: 'fm-detail' },
        h('button', { type: 'button', className: 'fm-back', onClick: props.onBack }, `← ${t('detail.back')}`),
        h(
          'div',
          { className: 'fm-detail-head' },
          h(Avatar, { entry, size: 56 }),
          h(
            'div',
            { className: 'fm-detail-head-main' },
            h('h2', { className: 'fm-detail-title' }, entry.title),
            h('div', { className: 'fm-detail-sub' }, entry.name + (entry.owner ? ` · @${entry.owner}` : '')),
            h(
              'div',
              { className: 'fm-tags' },
              h('span', { className: 'fm-badge' }, t(`cat.${entry.category}`)),
              h('span', { className: 'fm-meta' }, h(IconDownload, { size: 11 }), compact(entry.downloads)),
              h('span', { className: 'fm-meta' }, h(IconStar, { size: 11 }), compact(entry.stars)),
              h(
                'button',
                {
                  type: 'button',
                  className: 'fm-heat fm-heat-btn',
                  title: t('heat.title'),
                  'aria-expanded': heatInfo ? 'true' : 'false',
                  onClick: () => setHeatInfo((value) => !value)
                },
                h(IconSpark, { size: 11 }),
                entry.heat,
                h('span', { className: 'fm-heat-q' }, '?')
              )
            )
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'fm-icon-btn' + (props.favorite ? ' is-fav' : ''),
              title: props.favorite ? t('favorite.remove') : t('favorite.add'),
              'aria-label': props.favorite ? t('favorite.remove') : t('favorite.add'),
              'aria-pressed': props.favorite ? 'true' : 'false',
              onClick: () => props.onFavorite(entry)
            },
            props.favorite ? h(IconStarFilled, { size: 18 }) : h(IconStar, { size: 18 })
          ),
          h(GetButton, { entry, t, job: props.job, onInstall: props.onInstall })
        ),
        heatInfo
          ? h(
              'div',
              { className: 'fm-heat-info' },
              h('strong', null, t('heat.title')),
              h('p', null, t('heat.body')),
              h(
                'p',
                { className: 'fm-note' },
                t('heat.parts')
                  .replace('{downloads}', compact(entry.downloads))
                  .replace('{stars}', compact(entry.stars))
                  .replace('{added}', dateLabel(entry.added) || '—')
              )
            )
          : null,
        h(
          'section',
          { className: 'fm-detail-block' },
          h('div', { className: 'fm-block-title' }, t('detail.about')),
          h('p', { className: 'fm-detail-text' }, primary),
          other && other !== primary
            ? h(
                'div',
                { className: 'fm-original' },
                h('span', { className: 'fm-original-label' }, otherLabel),
                h('p', null, other)
              )
            : !entry.descriptionZh && !entry.descriptionEn
              ? h('div', { className: 'fm-original' }, h('span', { className: 'fm-original-label' }, t('detail.noTranslation')))
              : null
        ),
        h(
          'section',
          { className: 'fm-detail-block' },
          h('div', { className: 'fm-block-title' }, t('note.title')),
          h('textarea', {
            className: 'fm-note-input',
            rows: 3,
            maxLength: 500,
            value: noteDraft,
            placeholder: t('note.placeholder'),
            'aria-label': t('note.title'),
            onChange: (event) => setNoteDraft(event.target.value),
            onBlur: () => props.onNote(noteDraft)
          }),
          h('p', { className: 'fm-note' }, t('note.saved'))
        ),
        h(
          'section',
          { className: 'fm-detail-block' },
          h('div', { className: 'fm-block-title' }, t('detail.capability')),
          h('p', { className: 'fm-detail-text' }, t(`cap.${entry.category}`))
        ),
        h(
          'section',
          { className: 'fm-detail-block' },
          h('div', { className: 'fm-block-title' }, t('detail.usage')),
          h(
            'ol',
            { className: 'fm-steps' },
            h('li', null, t('step.install')),
            h('li', null, t('step.restart')),
            h('li', null, t(`step.open.${entry.category}`)),
            h('li', null, t('step.config'))
          ),
          command
            ? h(
                'div',
                { className: 'fm-cmd' },
                h('code', null, command),
                h('button', { type: 'button', className: 'fm-btn is-small', onClick: copy }, copied ? t('detail.copied') : t('detail.copy'))
              )
            : null,
          h('p', { className: 'fm-note' }, t('detail.installNote'))
        ),
        h(
          'section',
          { className: 'fm-detail-block' },
          h('div', { className: 'fm-block-title' }, t('detail.compat')),
          !manifestReady
            ? h('p', { className: 'fm-note' }, t('detail.compatChecking'))
            : !compat
              ? h('p', { className: 'fm-note' }, t('detail.compatUnknown'))
              : h(
                  'div',
                  { className: 'fm-compat' },
                  h(
                    'div',
                    { className: 'fm-compat-row' },
                    h('span', { className: 'fm-compat-label' }, t('detail.compatRequires')),
                    h('code', null, compat.requirement || t('detail.compatNone')),
                    h('span', { className: 'fm-compat-label' }, t('detail.compatRuntime')),
                    h('code', null, compat.runtime || '—')
                  ),
                  h(
                    'div',
                    { className: 'fm-tags' },
                    h('span', { className: 'fm-badge' + (compatState ? ` is-${compatState}` : '') }, compatLabel),
                    manifest.deprecated ? h('span', { className: 'fm-badge is-bad' }, 'deprecated') : null,
                    manifest.version ? h('span', { className: 'fm-meta' }, `v${manifest.version}`) : null,
                    manifest.unpackedSize
                      ? h('span', { className: 'fm-meta' }, `${t('detail.size')} ${fmtBytes(manifest.unpackedSize)}`)
                      : null
                  ),
                  compatAdvice ? h('p', { className: 'fm-advice' }, compatAdvice) : null
                )
        ),
        manifest && manifest.readme && (manifest.readme.zh || manifest.readme.en)
          ? h(
              'section',
              { className: 'fm-detail-block' },
              h('div', { className: 'fm-block-title' }, t('detail.readme')),
              h(
                'p',
                { className: 'fm-detail-text fm-readme' },
                lang === 'zh' ? manifest.readme.zh || manifest.readme.en : manifest.readme.en || manifest.readme.zh
              ),
              h('p', { className: 'fm-note' }, t('detail.readmeNote'))
            )
          : null,
        h(
          'section',
          { className: 'fm-detail-block' },
          h('div', { className: 'fm-block-title' }, t('detail.links')),
          h(
            'div',
            { className: 'fm-links' },
            page ? h('a', { href: page, target: '_blank', rel: 'noreferrer' }, `${t('detail.page')} ↗`) : null,
            manifest && manifest.repository
              ? h(
                  'a',
                  {
                    href: String(manifest.repository).replace(/^git\+/, '').replace(/\.git$/, ''),
                    target: '_blank',
                    rel: 'noreferrer'
                  },
                  `${t('detail.repo')} ↗`
                )
              : null,
            h(
              'a',
              { href: `https://www.npmjs.com/package/${entry.name}`, target: '_blank', rel: 'noreferrer' },
              `${t('detail.npm')} ↗`
            ),
            entry.owner
              ? h('a', { href: `https://github.com/${entry.owner}`, target: '_blank', rel: 'noreferrer' }, `@${entry.owner} ↗`)
              : null
          )
        )
      );
    }

    function Skeleton() {
      return h(
        'div',
        null,
        h('div', { className: 'fm-skel fm-skel-hero' }),
        h('div', { className: 'fm-skel-grid' },
          h('div', { className: 'fm-skel fm-skel-card' }),
          h('div', { className: 'fm-skel fm-skel-card' }),
          h('div', { className: 'fm-skel fm-skel-card' }),
          h('div', { className: 'fm-skel fm-skel-card' })
        )
      );
    }

    function CompareView(props) {
      const items = props.items;
      const t = props.t;
      const text = props.text;
      const [manifests, setManifests] = useState({});
      const signature = items.map((item) => item.name).join('|');

      useEffect(() => {
        let cancelled = false;
        const missing = items.filter((item) => !manifests[item.name]);
        if (!missing.length) return undefined;
        Promise.all(
          missing.map(async (entry) => {
            try {
              const response = await fetch(`${API}/plugin?name=${encodeURIComponent(entry.name)}`, { cache: 'no-store' });
              return [entry.name, response.ok ? await response.json() : null];
            } catch (error) {
              return [entry.name, null];
            }
          })
        ).then((rows) => {
          if (cancelled) return;
          setManifests((previous) => {
            const next = Object.assign({}, previous);
            rows.forEach((row) => { next[row[0]] = row[1]; });
            return next;
          });
        });
        return () => { cancelled = true; };
      }, [signature]);

      const compatOf = (entry) => {
        const manifest = manifests[entry.name];
        if (!manifest) return { label: t('compare.loading'), detail: '', state: '' };
        const compat = manifest.compatibility;
        if (!compat) return { label: t('detail.compatUnknown'), detail: '', state: '' };
        const state = compat.compatible === true ? 'is-ok' : compat.compatible === false ? 'is-bad' : '';
        const label = compat.compatible === true
          ? t('detail.compatYes')
          : compat.compatible === false
            ? (compat.reason === 'not-a-dsh-bundle' ? t('detail.notBundle') : t('detail.compatNo'))
            : compat.reason === 'no-version-declared'
              ? t('detail.compatUndeclared')
              : t('detail.compatUnknown');
        const advice = compat.direction === 'below-min'
          ? t('detail.advice.belowMin')
          : compat.direction === 'above-max'
            ? t('detail.advice.aboveMax')
            : '';
        const filled = advice
          .replace('{runtime}', compat.runtime || '—')
          .replace('{requirement}', compat.requirement || '—');
        return {
          label,
          detail: filled || (compat.requirement ? `${t('detail.compatRequires')} ${compat.requirement}` : ''),
          state
        };
      };

      const rows = [
        ['heat', 'compare.row.heat', (entry) => h('b', null, entry.heat)],
        ['downloads', 'compare.row.downloads', (entry) => compact(entry.downloads)],
        ['stars', 'compare.row.stars', (entry) => compact(entry.stars)],
        ['category', 'compare.row.category', (entry) => t(`cat.${entry.category}`)],
        ['compat', 'compare.row.compat', (entry) => {
          const compat = compatOf(entry);
          return h('div', { className: 'fm-compare-compat' },
            h('span', { className: 'fm-badge ' + compat.state }, compat.label),
            compat.detail ? h('small', null, compat.detail) : null
          );
        }],
        ['size', 'compare.row.size', (entry) => {
          const manifest = manifests[entry.name];
          return manifest && manifest.unpackedSize ? fmtBytes(manifest.unpackedSize) : '—';
        }],
        ['added', 'compare.row.added', (entry) => dateLabel(entry.added) || '—'],
        ['desc', 'compare.row.desc', (entry) => h('span', { className: 'fm-compare-desc' }, text(entry))],
        ['command', 'compare.row.command', (entry) => h('code', { className: 'fm-compare-code' }, entry.command || `dsh plugin add ${entry.spec}`)]
      ];

      return h('div', { className: 'fm-compare' },
        h('button', { type: 'button', className: 'fm-back', onClick: props.onBack }, `← ${t('detail.back')}`),
        h('div', { className: 'fm-compare-head' },
          h('h2', { className: 'fm-detail-title' }, t('compare.title')),
          h('p', { className: 'fm-note' }, t('compare.hint'))
        ),
        items.length === 0
          ? h('p', { className: 'fm-note' }, t('compare.empty'))
          : h('div', { className: 'fm-compare-scroll' },
          h('table', { className: 'fm-compare-table' },
            h('thead', null,
              h('tr', null,
                h('th', null, ''),
                items.map((entry) => h('th', { key: entry.name },
                  h('div', { className: 'fm-compare-plugin' },
                    h(Avatar, { entry, size: 34 }),
                    h('div', { className: 'fm-compare-plugin-main' },
                      h('div', { className: 'fm-compare-name' }, entry.title),
                      h('div', { className: 'fm-compare-owner' }, entry.owner ? `@${entry.owner}` : entry.name)
                    ),
                    h('button', {
                      type: 'button',
                      className: 'fm-chip-x',
                      title: t('compare.remove'),
                      'aria-label': t('compare.remove'),
                      onClick: () => props.onRemove(entry)
                    }, '×')
                  )
                ))
              )
            ),
            h('tbody', null,
              rows.map((row) => h('tr', { key: row[0] },
                h('th', { scope: 'row' }, t(row[1])),
                items.map((entry) => h('td', { key: entry.name }, row[2](entry)))
              ))
            ),
            h('tfoot', null,
              h('tr', null,
                h('th', null, ''),
                items.map((entry) => h('td', { key: entry.name },
                  h(GetButton, { entry, t, small: true, job: props.jobs ? props.jobs[entry.name] : undefined, onInstall: props.onInstall }),
                  h('button', { type: 'button', className: 'fm-btn is-small', onClick: () => props.onOpen(entry) }, t('detail.more'))
                ))
              )
            )
          )
        )
      );
    }

    // ---------- the market panel ----------


    function StarTrend(props) {
      const points = (props.points || []).filter((point) => typeof point.stars === 'number');
      if (points.length < 2) return h('div', { className: 'fm-dash-nohistory' }, props.t('dash.noHistory'));
      const width = 220;
      const height = 40;
      const values = points.map((point) => point.stars);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      const coords = values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - 4 - ((value - min) / span) * (height - 8);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return h(
        'svg',
        { className: 'fm-spark', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'stars trend' },
        h('polyline', { points: coords.join(' '), fill: 'none', strokeWidth: '2', strokeLinejoin: 'round', strokeLinecap: 'round' })
      );
    }

    function DeltaBadge(props) {
      const value = props.value;
      if (typeof value !== 'number' || value === 0) return null;
      return h(
        'span',
        { className: 'fm-delta' + (value > 0 ? ' is-up' : ' is-down'), title: props.t('dash.delta') },
        `${value > 0 ? '+' : ''}${compact(value)}`
      );
    }

    function ProjectDashboard(props) {
      const { t, lang, onToast } = props;
      const feed = useProjectFeed();
      const [input, setInput] = useState('');
      const [adding, setAdding] = useState(false);
      const [busy, setBusy] = useState(false);
      const [confirming, setConfirming] = useState(null);
      const lastUnread = useRef(0);

      useEffect(() => {
        loadProjectsFeed().catch(() => {});
      }, []);

      useEffect(() => {
        if (feed.ready && feed.unread > lastUnread.current) {
          lastUnread.current = feed.unread;
          onToast('ok', t('dash.unread').replace('{n}', feed.unread));
        }
        if (feed.unread < lastUnread.current) lastUnread.current = feed.unread;
      }, [feed.ready, feed.unread]);

      const reload = async () => {
        setBusy(true);
        try {
          await loadProjectsFeed(true);
        } catch {
          onToast('error', t('dash.failed'));
        } finally {
          setBusy(false);
        }
      };

      const add = async () => {
        const raw = input.trim();
        if (!raw || adding) return;
        let repo = '';
        let npmName = '';
        if (/^https?:\/\/github\.com\//i.test(raw)) {
          repo = raw.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '').split('/').slice(0, 2).join('/');
        } else if (raw.startsWith('@') || !raw.includes('/')) {
          npmName = raw;
        } else {
          repo = raw.replace(/^\/+|\/+$/g, '');
        }
        setAdding(true);
        try {
          const response = await fetch(`${API}/projects`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ repo, npm: npmName })
          });
          if (response.status === 409) {
            onToast('error', t('dash.exists'));
            return;
          }
          if (response.status === 400) {
            onToast('error', t('dash.limit'));
            return;
          }
          if (response.status === 404) {
            onToast('error', t('dash.notFound'));
            return;
          }
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          setInput('');
          await loadProjectsFeed(true);
          onToast('ok', t('dash.added'));
        } catch {
          onToast('error', t('dash.invalid'));
        } finally {
          setAdding(false);
        }
      };

      const markSeen = async (id) => {
        try {
          await fetch(`${API}/projects/seen`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ id })
          });
          await loadProjectsFeed(true);
          onToast('ok', t('dash.marked'));
        } catch {
          onToast('error', t('dash.failed'));
        }
      };

      const remove = async (id) => {
        if (confirming !== id) {
          setConfirming(id);
          return;
        }
        setConfirming(null);
        try {
          await fetch(`${API}/projects/remove`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ id })
          });
          await loadProjectsFeed(true);
          onToast('ok', t('dash.removed'));
        } catch {
          onToast('error', t('dash.failed'));
        }
      };

      const items = feed.items || [];
      return h(
        'div',
        { className: 'fm-dash' },
        h(
          'div',
          { className: 'fm-section-head' },
          h('div', null, h('div', { className: 'fm-section-title' }, t('dash.title')), h('div', { className: 'fm-section-desc' }, t('dash.hint'))),
          h(
            'button',
            { type: 'button', className: 'fm-btn is-small', onClick: reload, disabled: busy },
            busy ? t('dash.refreshing') : t('dash.refresh')
          )
        ),
        h(
          'div',
          { className: 'fm-dash-add' },
          h('input', {
            type: 'text',
            value: input,
            placeholder: t('dash.addPlaceholder'),
            'aria-label': t('dash.addPlaceholder'),
            onChange: (event) => setInput(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') add();
            }
          }),
          h('button', { type: 'button', className: 'fm-btn is-primary', onClick: add, disabled: adding }, adding ? t('dash.adding') : t('dash.add'))
        ),
        !feed.ready
          ? h('div', { className: 'fm-empty' }, h('span', { className: 'fm-spin' }), h('div', { className: 'fm-empty-title' }, t('loading')))
          : !items.length
            ? h('div', { className: 'fm-empty' }, h('div', { className: 'fm-empty-title' }, t('dash.empty')))
            : h(
                'div',
                { className: 'fm-project-list' },
                items.map((item) => {
                  const feedback = item.feedback || [];
                  const unread = Number(item.unread) || 0;
                  return h(
                    'div',
                    { key: item.id, className: 'fm-project' },
                    h(
                      'div',
                      { className: 'fm-project-head' },
                      h(
                        'div',
                        { className: 'fm-project-title' },
                        h('div', { className: 'fm-project-name' }, item.title || item.repo || item.npm, item.market ? h('span', { className: 'fm-market-badge' + (item.market.listed ? ' is-on' : '') }, item.market.listed ? t('dash.listed').replace('{rank}', item.market.rank) : t('dash.unlisted')) : null),
                        h(
                          'div',
                          { className: 'fm-project-repo' },
                          item.repo
                            ? h('a', { href: item.repoUrl, target: '_blank', rel: 'noreferrer' }, item.repo)
                            : item.npm ? h('span', null, `npm: ${item.npm}`) : null,
                          item.lastUpdated
                            ? h('span', null, ` · ${t('dash.updated').replace('{time}', new Date(item.lastUpdated).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }))}`)
                            : null
                        )
                      ),
                      h(
                        'div',
                        { className: 'fm-project-actions' },
                        unread
                          ? h('button', { type: 'button', className: 'fm-btn is-small', onClick: () => markSeen(item.id) }, t('dash.markSeen'))
                          : null,
                        h('button', { type: 'button', className: 'fm-btn is-small', onClick: () => remove(item.id), title: t('dash.remove') }, confirming === item.id ? t('dash.confirmRemove') : t('dash.remove'))
                      )
                    ),
                    h(
                      'div',
                      { className: 'fm-project-metrics' },
                      h('div', { className: 'fm-metric' }, h('span', { className: 'fm-metric-label' }, t('dash.stars')), h('span', { className: 'fm-metric-value' }, item.stars == null ? '—' : compact(item.stars)), h(DeltaBadge, { value: item.starsDelta, t })),
                      h('div', { className: 'fm-metric' }, h('span', { className: 'fm-metric-label' }, t('dash.downloads')), h('span', { className: 'fm-metric-value' }, item.downloads == null ? '—' : compact(item.downloads)), h(DeltaBadge, { value: item.downloadsDelta, t })),
                      h('div', { className: 'fm-metric' }, h('span', { className: 'fm-metric-label' }, t('dash.forks')), h('span', { className: 'fm-metric-value' }, item.forks == null ? '—' : compact(item.forks))),
                      h('div', { className: 'fm-metric' }, h('span', { className: 'fm-metric-label' }, t('dash.issues')), h('span', { className: 'fm-metric-value' }, item.openIssues == null ? '—' : compact(item.openIssues)))
                    ),
                    h(StarTrend, { points: item.history, t }),
                    h(
                      'div',
                      { className: 'fm-feedback-head' },
                      h('span', null, t('dash.feedback')),
                      unread ? h('span', { className: 'fm-unread-badge' }, t('dash.unread').replace('{n}', unread)) : null
                    ),
                    feedback.length
                      ? h(
                          'div',
                          { className: 'fm-feedback-list' },
                          feedback.map((entry) =>
                            h(
                              'a',
                              {
                                key: entry.id,
                                href: entry.url,
                                target: '_blank',
                                rel: 'noreferrer',
                                className: 'fm-feedback' + (entry.createdAt && Date.parse(entry.createdAt) > Date.parse(item.lastSeenFeedbackAt || 0) ? ' is-unread' : '')
                              },
                              h('span', { className: 'fm-feedback-dot', 'aria-hidden': 'true' }),
                              h(
                                'span',
                                { className: 'fm-feedback-main' },
                                h('span', { className: 'fm-feedback-title' }, entry.title),
                                h('span', { className: 'fm-feedback-meta' }, `${entry.author} · ${entry.createdAt ? new Date(entry.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') : ''}${entry.comments ? ` · ${t('dash.comments').replace('{n}', entry.comments)}` : ''}`)
                              )
                            )
                          )
                        )
                      : h('div', { className: 'fm-dash-empty' }, t('dash.noFeedback')),
                    item.error ? h('div', { className: 'fm-dash-error' }, t('dash.failed')) : null
                  );
                })
              )
      );
    }

    function MarketPanel(props) {
      const t = props.t;
      const [data, setData] = useState(null);
      const [status, setStatus] = useState('loading');
      const [error, setError] = useState('');
      const [tab, setTab] = useState('featured');
      const [query, setQuery] = useState('');
      const [category, setCategory] = useState('all');
      const [busy, setBusy] = useState(false);
      const [lang, setLang] = useState(readLang);
      const [detail, setDetail] = useState(null);
      const [sort, setSort] = useState('heat');
      const [results, setResults] = useState(null);
      const [searching, setSearching] = useState(false);
      const [toggling, setToggling] = useState({});
      const [favorites, setFavorites] = useState(readFavorites);
      const [notes, setNotes] = useState(readNotes);
      const [compare, setCompare] = useState([]);
      const [comparing, setComparing] = useState(false);
      const updatesState = useUpdates();
      const [checking, setChecking] = useState(false);
      const [updating, setUpdating] = useState({});
      const [bulk, setBulk] = useState(null);
      const [confirmRemove, setConfirmRemove] = useState(null);
      const [jobs, setJobs] = useState({});
      const [toast, setToast] = useState(null);
      const panelRef = useRef(null);
      const searchRef = useRef(null);
      const importRef = useRef(null);

      const fetchSnapshot = async (attempt = 0) => {
        const response = await fetch(`${API}/snapshot`, { cache: 'no-store' });
        if (!response.ok) {
          // A freshly started Host can briefly answer before its plugin routes
          // are mounted. Retry the transient 404/405 instead of flashing the
          // full-screen failure state.
          const transient = response.status === 404 || response.status === 405 || response.status >= 500;
          if (transient && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
            return fetchSnapshot(attempt + 1);
          }
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      };

      const load = async () => {
        try {
          const next = await fetchSnapshot();
          writeToken = next && next.writeToken ? next.writeToken : '';
          setData(next);
          setStatus(next && next.ready ? 'ready' : 'syncing');
          setDetail((current) =>
            current && next && Array.isArray(next.entries)
              ? next.entries.find((item) => item.name === current.name) || current
              : current
          );
        } catch (cause) {
          setStatus('error');
          setError(cause && cause.message ? cause.message : 'request failed');
        }
      };

      useEffect(() => {
        load();
        loadUpdates().catch(() => {});
        const timer = setTimeout(() => {
          if (searchRef.current) searchRef.current.focus();
        }, 60);
        return () => clearTimeout(timer);
      }, []);

      useEffect(() => {
        if (status !== 'syncing') return undefined;
        const timer = setInterval(load, 2500);
        return () => clearInterval(timer);
      }, [status]);

      useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          if (detail) setDetail(null);
          else props.onClose();
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
      }, [props.onClose, detail]);

      useEffect(() => {
        saveLang(lang);
      }, [lang]);

      useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(null), 6000);
        return () => clearTimeout(timer);
      }, [toast]);

      useEffect(() => {
        const running = Object.entries(jobs).filter(([, job]) => job && job.status === 'running' && job.id);
        if (!running.length) return undefined;
        let cancelled = false;
        const timer = setInterval(async () => {
          for (const [name, job] of running) {
            try {
              const response = await fetch(`${API}/install?id=${encodeURIComponent(job.id)}`, { cache: 'no-store' });
              if (!response.ok) continue;
              const body = await response.json();
              if (cancelled) return;
              if (body.status === 'done' || body.status === 'failed') {
                setJobs((previous) => {
                  const next = { ...previous };
                  delete next[name];
                  return next;
                });
                if (body.status === 'done') {
                  const restart = body.result && body.result.application === 'restart-required';
                  setToast({ kind: 'ok', text: restart ? t('install.restart') : t('install.ok') });
                  load();
                } else {
                  const reason = (body.result && body.result.error && body.result.error.code) || body.error || '';
                  setToast({ kind: 'error', text: `${t('install.failed')}${reason ? ` · ${reason}` : ''}` });
                }
              }
            } catch {
              /* a transient poll failure is retried by the next tick */
            }
          }
        }, 1600);
        return () => {
          cancelled = true;
          clearInterval(timer);
        };
      }, [jobs, t]);

      useEffect(() => {
        const q = query.trim();
        if (tab !== 'featured' || (!q && category === 'all')) {
          setResults(null);
          setSearching(false);
          return undefined;
        }
        const controller = new AbortController();
        let active = true;
        const timer = setTimeout(async () => {
          setSearching(true);
          try {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            params.set('category', category);
            params.set('sort', sort);
            params.set('limit', '48');
            const response = await fetch(`${API}/search?${params.toString()}`, {
              signal: controller.signal,
              cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const body = await response.json();
            if (active) setResults(body);
          } catch {
            if (active) setResults({ total: 0, items: [] });
          } finally {
            if (active) setSearching(false);
          }
        }, 220);
        return () => {
          active = false;
          controller.abort();
          clearTimeout(timer);
        };
      }, [query, category, sort, tab]);

      const refresh = async () => {
        if (busy) return;
        setBusy(true);
        try {
          const response = await fetch(`${API}/refresh`, { method: 'POST', headers: writeHeaders() });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const next = await response.json();
          writeToken = next && next.writeToken ? next.writeToken : writeToken;
          setData(next);
          setStatus(next && next.ready ? 'ready' : 'syncing');
          setToast(next && next.error ? { kind: 'error', text: t('error.title') } : { kind: 'ok', text: t('panel.updated') });
        } catch (cause) {
          setStatus(data ? 'ready' : 'error');
          setError(cause && cause.message ? cause.message : 'request failed');
          setToast({ kind: 'error', text: t('error.title') });
        } finally {
          setBusy(false);
        }
      };

      const install = async (entry) => {
        if (!entry || entry.installed || jobs[entry.name]) return;
        setJobs((previous) => ({ ...previous, [entry.name]: { status: 'running' } }));
        try {
          const response = await fetch(`${API}/install`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ name: entry.name })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          setJobs((previous) => ({ ...previous, [entry.name]: { status: 'running', id: body.id } }));
        } catch (cause) {
          setJobs((previous) => {
            const next = { ...previous };
            delete next[entry.name];
            return next;
          });
          setToast({ kind: 'error', text: `${t('install.failed')} · ${cause && cause.message ? cause.message : 'error'}` });
        }
      };

      const entries = data && Array.isArray(data.entries) ? data.entries : [];
      const featured = data && Array.isArray(data.featured) ? data.featured : [];
      const leaderboard = data && Array.isArray(data.leaderboard) ? data.leaderboard : [];
      const rising = data && Array.isArray(data.rising) ? data.rising : [];
      const categories = data && Array.isArray(data.categories) ? data.categories : [];
      const installedBundles = data && Array.isArray(data.installed) ? data.installed : [];
      const updates = {};
      for (const item of updatesState.items) updates[item.name] = item;
      const pendingCount = Object.values(updates).filter(
        (item) => item.latest && item.current && item.latest !== item.current && !SELF_NAMES.has(item.name)
      ).length;
      const marketByName = new Map(entries.map((entry) => [entry.name, entry]));
      const normalizedQuery = query.trim();
      const resultsActive = Boolean(normalizedQuery) || category !== 'all';

      const hero = featured[0] || null;
      const secondary = featured.slice(1);

      const isFavorite = (name) => Boolean(favorites[name]);
      const toggleFavorite = (entry) => {
        if (!entry || !entry.name) return;
        setFavorites((previous) => {
          const next = { ...previous };
          if (next[entry.name]) delete next[entry.name];
          else next[entry.name] = entry;
          writeFavorites(next);
          return next;
        });
      };

      const saveNote = (name, text) => {
        if (!name) return;
        const value = String(text || '').trim().slice(0, 500);
        setNotes((previous) => {
          const next = { ...previous };
          if (value) next[name] = value;
          else delete next[name];
          writeNotes(next);
          return next;
        });
      };

      const toggleCompare = (entry) => {
        if (!entry || !entry.name) return;
        if (compare.some((item) => item.name === entry.name)) {
          setCompare(compare.filter((item) => item.name !== entry.name));
          return;
        }
        if (compare.length >= 3) {
          setToast({ kind: 'error', text: t('compare.limit') });
          return;
        }
        setCompare(compare.concat(entry));
      };

      const exportList = () => {
        const payload = {
          app: 'featured-market',
          version: 1,
          exportedAt: new Date().toISOString(),
          lang,
          favorites,
          notes
        };
        try {
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `featured-market-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          setToast({ kind: 'ok', text: t('backup.exported') });
        } catch {
          setToast({ kind: 'error', text: t('backup.failed') });
        }
      };

      const importList = async (event) => {
        const input = event.target;
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          const incomingFavorites =
            parsed && parsed.favorites && typeof parsed.favorites === 'object' && !Array.isArray(parsed.favorites)
              ? parsed.favorites
              : {};
          const incomingNotes =
            parsed && parsed.notes && typeof parsed.notes === 'object' && !Array.isArray(parsed.notes)
              ? parsed.notes
              : {};
          if (!Object.keys(incomingFavorites).length && !Object.keys(incomingNotes).length) {
            throw new Error('empty');
          }
          let added = 0;
          const nextFavorites = { ...favorites };
          for (const [name, entry] of Object.entries(incomingFavorites)) {
            if (!entry || typeof entry !== 'object' || !entry.name) continue;
            if (!nextFavorites[entry.name]) added += 1;
            nextFavorites[entry.name] = entry;
          }
          const nextNotes = { ...notes };
          for (const [name, text] of Object.entries(incomingNotes)) {
            const value = typeof text === 'string' ? text.trim().slice(0, 500) : '';
            if (name && value) nextNotes[name] = value;
          }
          setFavorites(nextFavorites);
          writeFavorites(nextFavorites);
          setNotes(nextNotes);
          writeNotes(nextNotes);
          setToast({ kind: 'ok', text: t('backup.imported').replace('{n}', added) });
        } catch {
          setToast({ kind: 'error', text: t('backup.failed') });
        }
      };

      const removeBundle = async (bundle) => {
        if (!bundle || SELF_NAMES.has(bundle.name)) return;
        if (confirmRemove !== bundle.name) {
          setConfirmRemove(bundle.name);
          setTimeout(() => {
            setConfirmRemove((current) => (current === bundle.name ? null : current));
          }, 4000);
          return;
        }
        setConfirmRemove(null);
        setToggling((previous) => ({ ...previous, [bundle.name]: true }));
        try {
          const response = await fetch(`${API}/remove`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ name: bundle.name })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          setToast({
            kind: body.application === 'failed' ? 'error' : 'ok',
            text: body.application === 'failed' ? t('remove.failed') : t('remove.done')
          });
          await load();
        } catch (cause) {
          setToast({ kind: 'error', text: `${t('remove.failed')} · ${cause && cause.message ? cause.message : 'error'}` });
        } finally {
          setToggling((previous) => {
            const next = { ...previous };
            delete next[bundle.name];
            return next;
          });
        }
      };

      const checkUpdates = async () => {
        if (checking) return;
        setChecking(true);
        try {
          const state = await loadUpdates(true);
          const count = state.count || 0;
          setToast({
            kind: 'ok',
            text: count ? t('update.available').replace('{n}', count) : t('update.none')
          });
        } catch (cause) {
          setToast({ kind: 'error', text: `${t('update.failed')} · ${cause && cause.message ? cause.message : 'error'}` });
        } finally {
          setChecking(false);
        }
      };

      const runUpdate = async (bundle, version, options = {}) => {
        if (!bundle || updating[bundle.name]) return false;
        setUpdating((previous) => ({ ...previous, [bundle.name]: true }));
        try {
          const response = await fetch(`${API}/update`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ name: bundle.name, version })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          if (!options.silent) {
            const restart = body.application === 'restart-required';
            setToast({ kind: 'ok', text: restart ? t('install.restart') : t('update.done') });
            await load();
            await loadUpdates(true).catch(() => {});
          }
          return true;
        } catch (cause) {
          if (!options.silent) {
            setToast({ kind: 'error', text: `${t('update.failed')} · ${cause && cause.message ? cause.message : 'error'}` });
          }
          return false;
        } finally {
          setUpdating((previous) => {
            const next = { ...previous };
            delete next[bundle.name];
            return next;
          });
        }
      };

      const runAllUpdates = async () => {
        if (bulk || !pendingCount) return;
        const pending = Object.values(updates).filter(
          (item) => item.latest && item.current && item.latest !== item.current && !SELF_NAMES.has(item.name)
        );
        let done = 0;
        let failed = false;
        setBulk({ done, total: pending.length });
        for (const item of pending) {
          const bundle = installedBundles.find((candidate) => candidate.name === item.name);
          if (!bundle) continue;
          const ok = await runUpdate(bundle, item.latest, { silent: true });
          if (!ok) {
            failed = true;
            break;
          }
          done += 1;
          setBulk({ done, total: pending.length });
        }
        setBulk(null);
        await load();
        await loadUpdates(true).catch(() => {});
        if (failed) setToast({ kind: 'error', text: t('update.failed') });
        else if (done) setToast({ kind: 'ok', text: t('update.allDone').replace('{n}', done) });
      };

      const text = (entry) => {
        if (lang === 'zh') return entry.descriptionZh || entry.descriptionEn || entry.description || '';
        return entry.descriptionEn || entry.descriptionZh || entry.description || '';
      };

      const toggleBundle = async (bundle) => {
        if (!bundle || toggling[bundle.name]) return;
        setToggling((previous) => ({ ...previous, [bundle.name]: true }));
        try {
          const response = await fetch(`${API}/toggle`, {
            method: 'POST',
            headers: writeHeaders(),
            body: JSON.stringify({ name: bundle.name, enabled: !bundle.enabled })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
          setToast({
            kind: body.application === 'failed' ? 'error' : 'ok',
            text: body.application === 'failed' ? t('toggle.failed') : t('toggle.done')
          });
          await load();
        } catch (cause) {
          setToast({ kind: 'error', text: `${t('toggle.failed')} · ${cause && cause.message ? cause.message : 'error'}` });
        } finally {
          setToggling((previous) => {
            const next = { ...previous };
            delete next[bundle.name];
            return next;
          });
        }
      };

      const headSubtitle = data && data.ready
        ? `${t('panel.count').replace('{n}', compact(data.catalogTotal || 0))} · ${t('panel.subtitle')}`
        : t('panel.subtitle');

      const renderFeatured = () => {
        if (status === 'loading') return h(Skeleton);
        if (status === 'error') return renderError();
        if (!data || !data.ready) {
          return h(
            'div',
            { className: 'fm-empty' },
            h('span', { className: 'fm-spin' }),
            h('div', { className: 'fm-empty-title' }, t('loading')),
            h('div', { className: 'fm-empty-desc' }, t('error.hint'))
          );
        }
        if (resultsActive) {
          const items = results && Array.isArray(results.items) ? results.items : [];
          return h(
            'div',
            null,
            h(CategoryChips, { categories, category, setCategory, t, entries }),
            h(
              'div',
              { className: 'fm-section-head' },
              h(
                'div',
                { className: 'fm-section-title' },
                normalizedQuery
                  ? `${t('search.results')} · ${results ? results.total : '…'}`
                  : `${t('section.category')} · ${t(`cat.${category}`)}`
              ),
              h(
                'div',
                { className: 'fm-result-tools' },
                searching ? h('span', { className: 'fm-spin' }) : null,
                h(
                  'select',
                  {
                    className: 'fm-select',
                    value: sort,
                    'aria-label': t('sort.label'),
                    onChange: (event) => setSort(event.target.value)
                  },
                  ['heat', 'downloads', 'stars', 'new'].map((key) =>
                    h('option', { key, value: key }, t(`sort.${key}`))
                  )
                )
              )
            ),
            items.length
              ? h('div', { className: 'fm-grid' }, items.map((entry) =>
                  h(EntryCard, { key: entry.name, entry, t, lang, text, job: jobs[entry.name], onInstall: install, onOpen: setDetail, onCompare: toggleCompare, selected: compare.some((item) => item.name === entry.name) })
                ))
              : searching
                ? h(Skeleton)
                : h('div', { className: 'fm-empty' }, h('div', { className: 'fm-empty-title' }, t('empty.search')))
          );
        }
        return h(
          'div',
          null,
          hero ? h(HeroCard, { entry: hero, t, lang, text, job: jobs[hero.name], onInstall: install, onOpen: setDetail }) : null,
          h(CategoryChips, { categories, category, setCategory, t, entries }),
          h('div', { className: 'fm-section-head' },
            h('div', { className: 'fm-section-title' }, t('section.featured')),
            h('div', { className: 'fm-section-desc' }, t('section.featuredDesc'))
          ),
          h('div', { className: 'fm-grid' }, secondary.map((entry) =>
            h(EntryCard, { key: entry.name, entry, t, lang, text, job: jobs[entry.name], onInstall: install, onOpen: setDetail, onCompare: toggleCompare, selected: compare.some((item) => item.name === entry.name) })
          ))
        );
      };

      const renderHeat = () => {
        if (status === 'loading') return h(Skeleton);
        if (status === 'error') return renderError();
        if (!data || !data.ready) {
          return h('div', { className: 'fm-empty' }, h('span', { className: 'fm-spin' }), h('div', { className: 'fm-empty-title' }, t('loading')));
        }
        return h(
          'div',
          null,
          rising.length
            ? h(
                'div',
                null,
                h('div', { className: 'fm-section-head' },
                  h('div', { className: 'fm-section-title' }, t('section.rising')),
                  h('div', { className: 'fm-section-desc' }, t('section.heatDesc'))
                ),
                h('div', { className: 'fm-rising-row' }, rising.map((entry) =>
                  h(
                    'button',
                    {
                      key: entry.name,
                      type: 'button',
                      className: 'fm-rise',
                      title: entry.title,
                      onClick: () => setDetail(entry)
                    },
                    h(Avatar, { entry, size: 28 }),
                    h('span', { className: 'fm-rise-name' }, entry.title),
                    h('span', { className: 'fm-delta is-up' }, `+${entry.delta}`)
                  )
                ))
              )
            : null,
          h('div', { className: 'fm-section-head' },
            h('div', { className: 'fm-section-title' }, t('section.heat')),
            rising.length ? null : h('div', { className: 'fm-section-desc' }, t('section.heatDesc'))
          ),
          h('div', { className: 'fm-list' }, leaderboard.map((entry) =>
            h(RankRow, { key: entry.name, entry, t, lang, text, job: jobs[entry.name], onInstall: install, onOpen: setDetail, onCompare: toggleCompare, selected: compare.some((item) => item.name === entry.name) })
          ))
        );
      };

      const renderFavorites = () => {
        if (status === 'loading') return h(Skeleton);
        if (status === 'error') return renderError();
        const items = Object.values(favorites).filter(Boolean);
        return h(
          'div',
          null,
          h(
            'div',
            { className: 'fm-section-head' },
            h('div', { className: 'fm-section-title' }, t('section.favorites')),
            h(
              'div',
              { className: 'fm-result-tools' },
              h('div', { className: 'fm-section-desc' }, t('favorites.count').replace('{n}', items.length)),
              h('button', { type: 'button', className: 'fm-btn is-small', onClick: exportList }, t('backup.export')),
              h('button', { type: 'button', className: 'fm-btn is-small', onClick: () => importRef.current && importRef.current.click() }, t('backup.import')),
              h('input', {
                ref: importRef,
                type: 'file',
                accept: 'application/json,.json',
                className: 'fm-hidden-file',
                onChange: importList
              })
            )
          ),
          items.length
            ? h('div', { className: 'fm-grid' }, items.map((entry) =>
                h(EntryCard, { key: entry.name, entry, t, lang, text, job: jobs[entry.name], onInstall: install, onOpen: setDetail, onCompare: toggleCompare, selected: compare.some((item) => item.name === entry.name) })
              ))
            : h('div', { className: 'fm-empty' },
                h(IconStar, { size: 26 }),
                h('div', { className: 'fm-empty-title' }, t('empty.favorites'))
              )
        );
      };

      const renderInstalled = () => {
        if (status === 'loading') return h(Skeleton);
        if (status === 'error') return renderError();
        if (!data || !data.ready) {
          return h('div', { className: 'fm-empty' }, h('span', { className: 'fm-spin' }), h('div', { className: 'fm-empty-title' }, t('loading')));
        }
        return h(
          'div',
          null,
          h(
            'div',
            { className: 'fm-section-head' },
            h('div', { className: 'fm-section-title' }, t('section.installed')),
            h(
              'div',
              { className: 'fm-result-tools' },
              h('div', { className: 'fm-section-desc' }, t('installed.count').replace('{n}', installedBundles.length)),
              bulk
                ? h(
                    'div',
                    { className: 'fm-section-desc' },
                    t('update.allRunning').replace('{done}', bulk.done).replace('{total}', bulk.total)
                  )
                : null,
              pendingCount
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'fm-btn is-small is-primary',
                      onClick: runAllUpdates,
                      disabled: Boolean(bulk)
                    },
                    t('update.all').replace('{n}', pendingCount)
                  )
                : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'fm-btn is-small',
                  onClick: checkUpdates,
                  disabled: checking || Boolean(bulk),
                  title: updatesState.checkedAt
                    ? t('update.checked').replace(
                        '{time}',
                        new Date(updatesState.checkedAt).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      )
                    : undefined
                },
                checking ? t('update.checking') : t('update.check')
              )
            )
          ),
          installedBundles.length
            ? h(
                'div',
                { className: 'fm-list' },
                installedBundles.map((bundle) => {
                  const entry = marketByName.get(bundle.name);
                  const info = updates && updates[bundle.name];
                  const canUpdate = Boolean(info && info.latest && info.current && info.latest !== info.current);
                  const fallbackTitle = String(bundle.name || '').replace(/^@[^/]+\//, '');
                  const display = entry || {
                    name: bundle.name,
                    title: bundle.title || fallbackTitle,
                    owner: '',
                    hue: 215
                  };
                  return h(
                    'div',
                    { key: bundle.name, className: 'fm-row fm-installed-row' },
                    h(Avatar, { entry: display, size: 34 }),
                    h(
                      'div',
                      { className: 'fm-row-main' },
                      h('div', { className: 'fm-row-name' }, h('span', null, bundle.title || String(bundle.name || '').replace(/^@[^/]+\//, ''))),
                      h(
                        'div',
                        { className: 'fm-row-desc' },
                        `${bundle.version || ''}${entry ? '' : ` · ${t('installed.notListed')}`}`
                      )
                    ),
                    h(
                      'div',
                      { className: 'fm-row-stats' },
                      entry
                        ? h('button', { type: 'button', className: 'fm-btn is-small', onClick: () => setDetail(entry) }, t('detail.more'))
                        : null,
                      canUpdate
                        ? h('span', { className: 'fm-badge' }, `${t('update.to')} ${info.latest}`)
                        : null,
                      canUpdate
                        ? h(
                            'button',
                            {
                              type: 'button',
                              className: 'fm-btn is-small is-primary',
                              disabled: Boolean(updating[bundle.name]),
                              onClick: () => runUpdate(bundle, info.latest)
                            },
                            updating[bundle.name] ? t('action.installing') : t('update.run')
                          )
                        : null,
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'fm-link-btn' + (confirmRemove === bundle.name ? ' is-danger' : ''),
                          disabled: SELF_NAMES.has(bundle.name),
                          onClick: () => removeBundle(bundle)
                        },
                        confirmRemove === bundle.name ? t('remove.confirm') : t('remove.action')
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          role: 'switch',
                          'aria-checked': bundle.enabled ? 'true' : 'false',
                          'aria-label': bundle.title || bundle.name,
                          title: bundle.enabled ? t('toggle.on') : t('toggle.off'),
                          className: 'fm-switch' + (bundle.enabled ? ' is-on' : ''),
                          disabled: Boolean(toggling[bundle.name]) || SELF_NAMES.has(bundle.name),
                          onClick: () =>
                            SELF_NAMES.has(bundle.name)
                              ? setToast({ kind: 'error', text: t('toggle.self') })
                              : toggleBundle(bundle)
                        },
                        h('span')
                      )
                    )
                  );
                })
              )
            : h('div', { className: 'fm-empty' },
                h(IconStore, { size: 26 }),
                h('div', { className: 'fm-empty-title' }, t('empty.installed'))
              )
        );
      };

      const renderError = () =>
        h(
          'div',
          { className: 'fm-empty' },
          h(IconStore, { size: 28 }),
          h('div', { className: 'fm-empty-title' }, t('error.title')),
          h('div', { className: 'fm-empty-desc' }, `${t('error.hint')}${error ? ` (${error})` : ''}`),
          h('button', { type: 'button', className: 'fm-btn is-primary', style: { marginTop: 8 }, onClick: load }, t('action.retry'))
        );

      return h(
        React.Fragment,
        null,
        h('style', { key: 'fm-style' }, STYLE),
        h('div', { className: 'fm-layer', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('panel.title') },
          h('div', { className: 'fm-backdrop', onClick: props.onClose }),
          h(
            'div',
            { className: 'fm-panel', ref: panelRef },
            h(
              'header',
              { className: 'fm-head' },
              h(
                'div',
                { className: 'fm-brand' },
                h('div', { className: 'fm-brand-icon' }, h(IconStore, { size: 22 })),
                h(
                  'div',
                  { style: { minWidth: 0 } },
                  h('div', { className: 'fm-title' }, t('panel.title')),
                  h('div', { className: 'fm-sub' }, headSubtitle)
                )
              ),
              h(
                'div',
                { className: 'fm-head-actions' },
                h(
                  'div',
                  { className: 'fm-lang', role: 'group', 'aria-label': 'Language' },
                  h(
                    'button',
                    { type: 'button', className: lang === 'zh' ? 'is-active' : '', onClick: () => setLang('zh') },
                    '中'
                  ),
                  h(
                    'button',
                    { type: 'button', className: lang === 'en' ? 'is-active' : '', onClick: () => setLang('en') },
                    'EN'
                  )
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fm-icon-btn' + (busy || (data && data.refreshing) ? ' is-spinning' : ''),
                    title: t('action.refresh'),
                    'aria-label': t('action.refresh'),
                    onClick: refresh,
                    disabled: busy
                  },
                  h(IconRefresh, { size: 16 })
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fm-icon-btn',
                    title: t('action.close'),
                    'aria-label': t('action.close'),
                    onClick: props.onClose
                  },
                  h(IconClose, { size: 17 })
                )
              )
            ),
            h(
              'div',
              { className: 'fm-bar' },
              h(
                'div',
                { className: 'fm-tabs' },
                [['featured', t('tab.featured')], ['heat', t('tab.heat')], ['projects', t('tab.projects')], ['favorites', t('tab.favorites')], ['installed', t('tab.installed')]].map(([id, label]) =>
                  h(
                    'button',
                    {
                      key: id,
                      type: 'button',
                      className: 'fm-tab' + (tab === id ? ' is-active' : ''),
                      onClick: () => {
                        setTab(id);
                        setCategory('all');
                        setDetail(null);
                      }
                    },
                    label
                  )
                )
              ),
              h(
                'label',
                { className: 'fm-search' },
                h(IconSearch, { size: 14 }),
                h('input', {
                  ref: searchRef,
                  type: 'search',
                  value: query,
                  placeholder: t('search.placeholder'),
                  'aria-label': t('search.placeholder'),
                  onChange: (event) => {
                    setQuery(event.target.value);
                    setTab('featured');
                    setDetail(null);
                  }
                })
              )
            ),
            h(
              'div',
              { className: 'fm-body' },
              comparing
                ? h(CompareView, {
                    items: compare,
                    t,
                    lang,
                    text,
                    jobs,
                    onInstall: install,
                    onBack: () => setComparing(false),
                    onOpen: setDetail,
                    onRemove: toggleCompare
                  })
                : detail
                ? h(DetailView, {
                    entry: detail,
                    t,
                    lang,
                    text,
                    favorite: isFavorite(detail.name),
                    onFavorite: toggleFavorite,
                    note: notes[detail.name] || '',
                    onNote: (text) => saveNote(detail.name, text),
                    job: jobs[detail.name],
                    onInstall: install,
                    onBack: () => setDetail(null)
                  })
                : tab === 'featured'
                  ? renderFeatured()
                  : tab === 'heat'
                    ? renderHeat()
                    : tab === 'projects'
                      ? h(ProjectDashboard, { t, lang, onToast: (kind, text) => setToast({ kind, text }) })
                      : tab === 'favorites'
                        ? renderFavorites()
                        : renderInstalled()
            ),
            compare.length && !detail && !comparing
              ? h(
                  'div',
                  { className: 'fm-compare-bar' },
                  h('span', { className: 'fm-compare-count' }, t('compare.bar').replace('{n}', compare.length)),
                  h(
                    'div',
                    { className: 'fm-compare-chips' },
                    compare.map((item) =>
                      h(
                        'span',
                        { key: item.name, className: 'fm-compare-chip' },
                        h(Avatar, { entry: item, size: 20 }),
                        h('span', null, item.title),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'fm-chip-x',
                            title: t('compare.remove'),
                            'aria-label': t('compare.remove'),
                            onClick: () => toggleCompare(item)
                          },
                          '×'
                        )
                      )
                    )
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'fm-btn is-small',
                      onClick: () => {
                        if (compare.length < 2) {
                          setToast({ kind: 'error', text: t('compare.hint') });
                          return;
                        }
                        setDetail(null);
                        setComparing(true);
                      }
                    },
                    t('compare.start')
                  ),
                  h(
                    'button',
                    { type: 'button', className: 'fm-btn is-small', onClick: () => setCompare([]) },
                    t('compare.clear')
                  )
                )
              : null,
            h(
              'footer',
              { className: 'fm-foot' },
              h(
                'div',
                { className: 'fm-foot-group' },
                h('span', null, `${t('footer.source')} `, h('b', null, data && data.source ? data.source : 'awesome-dsh-plugin.com')),
                data && data.ready
                  ? h('span', null, `${t('footer.catalog')} `, h('b', null, compact(data.catalogTotal || 0)))
                  : null,
                data && data.ready && data.generatedAt
                  ? h('span', null, `${t('footer.updated')} `, h('b', null, dateLabel(data.generatedAt)))
                  : null,
                data && data.ready
                  ? h('span', null, `${t('footer.accepted')} `, h('b', null, compact(data.accepted || 0)))
                  : null
              ),
              h(
                'div',
                { className: 'fm-foot-group' },
                data && data.error
                  ? h('span', { className: 'fm-warn', title: String(data.error) }, t('footer.stale'))
                  : null,
                data && data.nextRefreshAt
                  ? h('span', null, `${t('footer.next')} `, h('b', null, dateLabel(data.nextRefreshAt)))
                  : null
              )
            ),
            toast
              ? h(
                  'div',
                  { className: `fm-toast ${toast.kind === 'error' ? 'is-error' : 'is-ok'}` },
                  toast.kind === 'error' ? h(IconClose, { size: 13 }) : h(IconCheck, { size: 13 }),
                  toast.text
                )
              : null
          )
        )
      );
    }

    function CategoryChips(props) {
      const t = props.t;
      const counts = new Map((props.categories || []).map((category) => [category.id, category.count]));
      const ids = ['all'].concat((props.categories || []).map((category) => category.id));
      return h(
        'div',
        { className: 'fm-chips' },
        ids.map((id) =>
          h(
            'button',
            {
              key: id,
              type: 'button',
              className: 'fm-chip' + (props.category === id ? ' is-active' : ''),
              onClick: () => props.setCategory(id)
            },
            t(`cat.${id}`),
            id !== 'all' && counts.has(id) ? ` ${counts.get(id)}` : ''
          )
        )
      );
    }

    class PanelBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      componentDidCatch(error, info) {
        console.error('[featured-market] panel crashed', error, info);
      }
      render() {
        if (this.state.error) {
          return h(
            'div',
            { className: 'fm-overlay' },
            h(
              'div',
              { className: 'fm-panel', style: { minHeight: '220px', alignItems: 'center', justifyContent: 'center' } },
              h('div', { className: 'fm-empty-title' }, this.props.t('panel.crashed')),
              h('div', { className: 'fm-section-desc' }, String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)),
              h('button', { type: 'button', className: 'fm-btn is-primary', style: { marginTop: '14px' }, onClick: this.props.onClose }, this.props.t('panel.close'))
            )
          );
        }
        return this.props.children;
      }
    }

    function OverlayEntry() {
      const open = useOpen();
      if (!open) return null;
      return h(
        PanelBoundary,
        { t: tRef.current, onClose: () => setOpen(false) },
        h(MarketPanel, { onClose: () => setOpen(false), t: tRef.current })
      );
    }

    let tRef = { current: (key) => key };

    function dismissPreviewNotice() {
      // DSH shows a first-run "Preview Notice" dialog. In some window modes its
      // dialog is painted off-screen or behind the shell while its full-screen
      // mask still swallows pointer events, so the store button looks dead.
      // Acknowledge that exact dialog once, not any other modal.
      try {
        const dialogs = document.querySelectorAll('[role="dialog"][aria-label="Preview Notice"]');
        for (const dialog of dialogs) {
          const button = Array.from(dialog.querySelectorAll('button')).find((item) =>
            /continue/i.test(item.textContent || '')
          );
          if (button) button.click();
        }
      } catch {
        // ignore a host DOM that is mid-teardown
      }
    }

    function QuickAction() {
      const open = useOpen();
      const updates = useUpdates();
      const projects = useProjectFeed();
      const t = tRef.current;
      const buttonRef = useRef(null);
      const bits = [];
      if (updates.count) bits.push(t('update.badgeTitle').replace('{n}', updates.count));
      if (projects.unread) bits.push(t('dash.unread').replace('{n}', projects.unread));
      const label = bits.length ? `${t('nav.label')} · ${bits.join(' · ')}` : t('nav.label');
      useEffect(() => {
        loadUpdates().catch(() => {});
        loadProjectsFeed().catch(() => {});
        const noticeTimer = setTimeout(dismissPreviewNotice, 700);
        const timer = setInterval(() => {
          loadUpdates().catch(() => {});
          loadProjectsFeed().catch(() => {});
          dismissPreviewNotice();
        }, 5 * 60 * 1000);
        return () => {
          clearTimeout(noticeTimer);
          clearInterval(timer);
        };
      }, []);
      useEffect(() => {
        // If an invisible host mask covers the footer, the click target is the
        // mask rather than our button. Treat a pointer inside the button's
        // rectangle as a store click so the entry point cannot dead-end.
        const onPointerDown = (event) => {
          const node = buttonRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            return;
          }
          if (node.contains(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(!bus.open);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
      }, []);
      return h(
        React.Fragment,
        null,
        h('style', { key: 'fm-action-style' }, ACTION_CSS),
        h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            className: 'fm-action' + (updates.count || projects.unread ? ' has-updates' : ''),
            title: label,
            'aria-label': label,
            'aria-expanded': open ? 'true' : 'false',
            onClick: () => setOpen(!open)
          },
          h(IconStore, { size: 18 }),
          updates.count || projects.unread ? h('span', { key: 'dot', className: 'fm-action-dot', 'aria-hidden': 'true' }) : null
        )
      );
    }

    const ACTION_CSS = `
.fm-action{position:relative;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;}
.fm-action:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.fm-action.has-updates{color:var(--dsw-alias-brand-primary);}
.fm-action[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);}
.fm-action:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}
.fm-action-dot{position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));}
`;

    return {
      inject: ['slots', 'theme', 'locale'],

      apply(ctx) {
        let disposeEn = null;
        let disposeZh = null;
        try {
          disposeEn = ctx.locale.register('featured-market', 'en', EN);
          disposeZh = ctx.locale.register('featured-market', 'zh', ZH);
        } catch (error) {
          console.error('[featured-market] locale registration failed', error);
        }
        const t = ctx.locale.bind('featured-market');
        tRef.current = t;

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            {
              name: 'sidebar.footer.action',
              id: 'featured-market-quick',
              order: 6,
              label: () => t('nav.label')
            },
            QuickAction
          )
        );

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'featured-market-overlay',
              order: 55
            },
            OverlayEntry
          )
        );
      }
    };
  }
});
