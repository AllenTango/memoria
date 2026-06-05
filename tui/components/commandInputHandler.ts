/**
 * CommandInput 的核心键位处理逻辑 — 抽成纯函数以便单测
 *
 * 设计原则:
 * - 无副作用:每次调用返回下一个 state + 可选命令,React state 变更在调用方做
 * - j/k 显式忽略(留给 FileTree 滚动资源栏)
 * - ↑/↓ 仅在 showHints 激活时移动 selected
 * - Enter 总是用最新的 input/filtered/selected 计算
 * - 状态机:`/server\r` → onCommand('/server') + 重置 input/showHints/selected
 */
import type { CommandItem } from './commandItems';

export interface HandlerKey {
  upArrow?: boolean;
  downArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  backspace?: boolean;
  ctrl?: boolean;
}

export interface HandlerState {
  input: string;
  showHints: boolean;
  selected: number;
}

export interface HandlerResult {
  next: HandlerState;
  /** 如果该按键触发了命令,这里填命令字符串 */
  command?: string;
  /** 该按键是否被消费(没消费 = 完全忽略,例如 j/k) */
  consumed: boolean;
}

export function fuzzyMatch(cmd: string, input: string): boolean {
  if (!input) return true;
  const needle = input.toLowerCase();
  let j = 0;
  for (const ch of cmd.toLowerCase()) {
    if (ch === needle[j]) j++;
    if (j === needle.length) return true;
  }
  return false;
}

/**
 * 过滤命令列表(fuzzy match cmd 和 desc)
 */
export function filterCommands(allCommands: CommandItem[], input: string, showHints: boolean): CommandItem[] {
  if (!showHints) return [];
  if (input === '/') return allCommands;
  return allCommands.filter(c => fuzzyMatch(c.cmd, input) || fuzzyMatch(c.desc, input));
}

/**
 * 处理一次按键,返回下一个 state + 是否触发命令
 *
 * @param allCommands 全部可执行命令(传进来便于纯函数测试)
 * @param state 当前 state
 * @param inp   Ink 传来的 input 字符串
 * @param key   Ink 传来的 key 对象
 */
export function processKey(
  allCommands: CommandItem[],
  state: HandlerState,
  inp: string,
  key: HandlerKey
): HandlerResult {
  const { input, showHints, selected } = state;
  const filtered = filterCommands(allCommands, input, showHints);

  // 显式忽略 vim 移动键 j/k(留给 FileTree)
  if (inp === 'j' || inp === 'k') {
    return { next: state, consumed: false };
  }

  // ↑/↓ 导航
  if (key.upArrow) {
    if (showHints && filtered.length > 0) {
      return {
        next: { ...state, selected: (selected - 1 + filtered.length) % filtered.length },
        consumed: true,
      };
    }
    return { next: state, consumed: false };
  }
  if (key.downArrow) {
    if (showHints && filtered.length > 0) {
      return {
        next: { ...state, selected: (selected + 1) % filtered.length },
        consumed: true,
      };
    }
    return { next: state, consumed: false };
  }

  // Enter
  if (key.return) {
    const trimmed = input.trim();
    // 完全没动过(初始 state:showHints=false 且 input 还是占位符 '/')→ 不触发
    // 这是关键边界:按 / 后 input 仍是 '/',但 showHints=true,这时 Enter 应该执行
    if (!showHints && input === INITIAL_STATE.input) {
      return { next: state, consumed: true };
    }
    // 空字符串 → 不触发
    if (!trimmed) {
      return { next: state, consumed: true };
    }
    // input 是 '/'(用户只按了 / 激活)或 'x' 等非命令字符,只要有 filtered 结果就执行 selected
    // (这是 opencode / claude-code 风格:按 / 唤出 → ↑↓ 选 → Enter 立刻执行,不需要键入完整指令)
    if (filtered.length > 0) {
      // 精确匹配优先
      const exact = filtered.find(c => c.cmd === trimmed);
      const target = exact || filtered[selected] || filtered[0];
      return {
        next: { input: '/', showHints: false, selected: 0 },
        command: target.cmd,
        consumed: true,
      };
    }
    // 没有 filtered(用户没按 / 激活,直接键入文本)→ fallback 用 trimmed
    return {
      next: { input: '/', showHints: false, selected: 0 },
      command: trimmed,
      consumed: true,
    };
  }

  // Esc
  if (key.escape) {
    return {
      next: { input: '/', showHints: false, selected: 0 },
      consumed: true,
    };
  }

  // Backspace
  if (key.backspace) {
    const nextInput = input.length > 1 ? input.slice(0, -1) : '/';
    const nextShowHints = input.length > 1 ? showHints : false;
    return {
      next: { input: nextInput, showHints: nextShowHints, selected: 0 },
      consumed: true,
    };
  }

  // `/` 激活(仅当不在 showHints 状态时 — 防止已激活再按 / 误清空 input)
  if (inp === '/') {
    return {
      next: { input: '/', showHints: true, selected: 0 },
      consumed: true,
    };
  }

  // 其他可打印字符:在 showHints 时拼接到 input
  if (inp && showHints) {
    if (inp.length === 1 && inp.charCodeAt(0) >= 0x20) {
      const nextInput = input + inp;
      return {
        next: { input: nextInput, showHints, selected: 0 },
        consumed: true,
      };
    }
  }

  // 未消费
  return { next: state, consumed: false };
}

/** 初始 state */
export const INITIAL_STATE: HandlerState = { input: '/', showHints: false, selected: 0 };
