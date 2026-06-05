/**
 * TUI View exports
 *
 * 重构后:只保留两个顶层视图
 *   - SiteSelector:未打开项目时的站点选择
 *   - SiteDashboard:已打开站点的管理仪表盘
 *
 * 原本需要"开新页面"嘅操作(创建站点/打开项目/新建内容/选择主题)全部嵌入
 * SiteSelector / SiteDashboard 嘅右栏,由 view 内部 mode 状态管理
 */
export { SiteSelector } from './SiteSelector';
export { SiteDashboard } from './SiteDashboard';
