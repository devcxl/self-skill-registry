/**
 * i18n messages — flat keys with {placeholder} interpolation.
 * English is the source of truth; fall back to it for missing keys.
 */

export type Locale = 'en' | 'zh';

export const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    // Layout / nav
    'nav.home': 'Home',
    'nav.browse': 'Browse',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'footer.tagline': 'Internal tool for AI coding agent skills',

    // Home page
    'home.hero': 'Internal skill marketplace for AI coding agents. Browse, evaluate, and install skills for OpenCode, Claude Code, and Codex.',
    'home.browseCta': 'Browse Skills',
    'home.skillsAvailable': '{n} skills available',
    'home.recentSkills': 'Recent Skills',

    // Skills list
    'skills.title': 'Skills',
    'skills.count': '{n} skill(s) available',
    'skills.searchPlaceholder': 'Search skills…',
    'skills.search': 'Search',
    'skills.empty': 'No skills found.',

    // Skill detail
    'detail.details': 'Details',
    'detail.version': 'Version',
    'detail.score': 'Score',
    'detail.status': 'Status',
    'detail.compatibility': 'Compatibility',
    'detail.category': 'Category',
    'detail.scoresByCategory': 'Scores by Category',
    'detail.install': 'Install',
    'detail.cliCommand': 'CLI command',
    'detail.directDownload': 'Direct download',
    'detail.downloadTarball': 'Download tarball',
    'detail.readme': 'README',

    // Errors
    'error.backHome': '← Back to Home',
    'error.skillNotFound': 'Skill Not Found',
    'error.skillNotAvailable': 'Skill "{name}" is not available.',

    // Settings
    'settings.accountSettings': 'Account Settings',
    'settings.profile': 'Profile',
    'settings.name': 'Name',
    'settings.email': 'Email',
    'settings.provider': 'Provider',
    'settings.role': 'Role',
    'settings.roleAdmin': 'Admin',
    'settings.apiTokens': 'API Tokens',
    'settings.noTokens': 'No tokens yet.',
    'settings.revoke': 'Revoke',
    'settings.label': 'Label',
    'settings.create': 'Create',
    'settings.signOut': 'Sign Out',
    'settings.tokenCreated': 'Token Created',
    'settings.tokenCopyWarning': 'Copy this token now. It will not be shown again.',
    'settings.backToSettings': '← Back to Settings',

    // Admin
    'admin.accessDenied': 'Access Denied',
    'admin.noPermission': 'You do not have permission to view this page.',
    'admin.panel': 'Admin Panel',
    'admin.manage': 'Manage skills and users',
    'admin.pending': 'Pending / Non-Approved Skills ({n})',
    'admin.noPending': 'No pending skills.',
    'admin.allSkills': 'All Skills',
    'admin.name': 'Name',
    'admin.email': 'Email',
    'admin.provider': 'Provider',
    'admin.role': 'Role',
    'admin.action': 'Action',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.versionScore': 'v{version} · Score: {score} · Status:',
  },
  zh: {
    // Layout / nav
    'nav.home': '首页',
    'nav.browse': '浏览',
    'nav.settings': '设置',
    'nav.admin': '管理',
    'footer.tagline': 'AI 编码代理技能内部工具',

    // Home page
    'home.hero': '面向 AI 编码代理的内部技能市场。浏览、评估并安装适用于 OpenCode、Claude Code 和 Codex 的技能。',
    'home.browseCta': '浏览技能',
    'home.skillsAvailable': '共 {n} 个技能',
    'home.recentSkills': '最新技能',

    // Skills list
    'skills.title': '技能',
    'skills.count': '共 {n} 个技能',
    'skills.searchPlaceholder': '搜索技能…',
    'skills.search': '搜索',
    'skills.empty': '未找到技能。',

    // Skill detail
    'detail.details': '详情',
    'detail.version': '版本',
    'detail.score': '评分',
    'detail.status': '状态',
    'detail.compatibility': '兼容性',
    'detail.category': '分类',
    'detail.scoresByCategory': '分类评分',
    'detail.install': '安装',
    'detail.cliCommand': 'CLI 命令',
    'detail.directDownload': '直接下载',
    'detail.downloadTarball': '下载压缩包',
    'detail.readme': 'README',

    // Errors
    'error.backHome': '← 返回首页',
    'error.skillNotFound': '技能未找到',
    'error.skillNotAvailable': '技能 "{name}" 不可用。',

    // Settings
    'settings.accountSettings': '账户设置',
    'settings.profile': '个人资料',
    'settings.name': '名称',
    'settings.email': '邮箱',
    'settings.provider': '提供商',
    'settings.role': '角色',
    'settings.roleAdmin': '管理员',
    'settings.apiTokens': 'API 令牌',
    'settings.noTokens': '暂无令牌。',
    'settings.revoke': '撤销',
    'settings.label': '标签',
    'settings.create': '创建',
    'settings.signOut': '退出登录',
    'settings.tokenCreated': '令牌已创建',
    'settings.tokenCopyWarning': '请立即复制此令牌，之后将不再显示。',
    'settings.backToSettings': '← 返回设置',

    // Admin
    'admin.accessDenied': '访问被拒绝',
    'admin.noPermission': '您没有权限查看此页面。',
    'admin.panel': '管理面板',
    'admin.manage': '管理技能与用户',
    'admin.pending': '待审核 / 未通过技能（{n}）',
    'admin.noPending': '暂无待审核技能。',
    'admin.allSkills': '全部技能',
    'admin.name': '名称',
    'admin.email': '邮箱',
    'admin.provider': '提供商',
    'admin.role': '角色',
    'admin.action': '操作',
    'admin.approve': '通过',
    'admin.reject': '拒绝',
    'admin.versionScore': 'v{version} · 评分：{score} · 状态：',
  },
};
