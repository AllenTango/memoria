// 纯函数 processKey 单测 — 验证 Enter 执行、j/k 忽略、↑↓导航、Backspace、Esc 等
import { processKey, INITIAL_STATE, filterCommands } from '../../tui/components/commandInputHandler.ts';
import { ALL_COMMANDS } from '../../tui/components/commandItems.ts';

let failures = 0;
let pass = 0;

function expect(name, cond, detail) {
  if (cond) {
    console.log('  \u2713', name);
    pass++;
  } else {
    console.error('  FAIL', name, detail ?? '');
    failures++;
  }
}

function runScenario(name, steps) {
  console.log(`\n[${name}]`);
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const step of steps) {
    const result = processKey(ALL_COMMANDS, state, step.inp, step.key);
    state = result.next;
    if (result.command) commands.push(result.command);
  }
  return { state, commands };
}

console.log('=== processKey 纯函数单测 ===');

// ── 场景 1: /server + Enter ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: 'v', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景1: /server + Enter → onCommand(["/server"])',
    commands.length === 1 && commands[0] === '/server',
    { actual: commands });
}

// ── 场景 2: /s + Enter (fuzzy → server) ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景2: /s + Enter (fuzzy → server)',
    commands.length === 1 && commands[0] === '/server',
    { actual: commands });
}

// ── 场景 3: j/k 不污染,接着 /server + Enter ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 'j', key: {} },
    { inp: 'k', key: {} },
    { inp: 's', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: 'v', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景3: /jk 后接 server + Enter → onCommand(["/server"])',
    commands.length === 1 && commands[0] === '/server',
    { actual: commands, finalInput: state.input });
}

// ── 场景 4: Esc 取消 ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: 'v', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: '', key: { escape: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景4: Esc 取消 → 没有 onCommand 调用',
    commands.length === 0,
    { actual: commands });
  expect('场景4: Esc 后 state 重置为初始',
    state.input === '/' && !state.showHints,
    { state });
}

// ── 场景 5: /stop + Enter ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: 't', key: {} },
    { inp: 'o', key: {} },
    { inp: 'p', key: {} },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景5: /stop + Enter → /stop',
    commands.length === 1 && commands[0] === '/stop',
    { actual: commands });
}

// ── 场景 6: ↓导航 /s + ↓ + Enter → /stop ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: '', key: { downArrow: true } },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  // /s fuzzy 匹配:[/server, /stop],selected=0
  // ↓ → selected=1
  // Enter → filtered[1] = /stop
  expect('场景6: /s + ↓ + Enter → /stop',
    commands.length === 1 && commands[0] === '/stop',
    { actual: commands, finalSelected: state.selected });
}

// ── 场景 7: Backspace ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: 'v', key: {} },
    { inp: 'e', key: {} },
    { inp: 'r', key: {} },
    { inp: '', key: { backspace: true } },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  // 精确匹配优先:/serve 不是任何 cmd 的精确形式,fallback 到 fuzzy 第一条(/server)
  expect('场景7: /server + ⌫ + Enter → fuzzy 第一条 /server',
    commands.length === 1 && commands[0] === '/server',
    { actual: commands, finalInput: state.input });
}

// ── 场景 8: ↑ 在边界(从 0 上) 回到末尾 ──
{
  let state = { ...INITIAL_STATE };
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: '', key: { upArrow: true } },
  ]) {
    state = processKey(ALL_COMMANDS, state, inp, key).next;
  }
  expect('场景8: / 后按 ↑(filtered 满),selected 跳到末尾',
    state.selected === ALL_COMMANDS.length - 1,
    { selected: state.selected, all: ALL_COMMANDS.length });
}

// ── 场景 9: 空 input + Enter 不触发 ──
{
  let state = { ...INITIAL_STATE };
  const r = processKey(ALL_COMMANDS, state, '', { return: true });
  expect('场景9: 空 input + Enter → 无 command',
    !r.command,
    { result: r });
}

// ── 场景 10: 非斜杠命令也能走 onCommand(legacy 路径) ──
{
  // 模拟:showHints=true 且 input='foo'(以 / 开头但不匹配)
  let state = { input: '/', showHints: true, selected: 0 };
  for (const ch of 'f') state = processKey(ALL_COMMANDS, state, ch, {}).next;
  // 实际上 'f' 在 hints 模式下会被拼成 '/f',然后 Enter 会走 fallback
  // 关键测试:拼出的 input 是 '/f',Enter 时 filtered 为空(fuzzy '/f' 不匹配任何),走 else
  const r = processKey(ALL_COMMANDS, state, '', { return: true });
  expect('场景10: 无匹配命令时,Enter 走 fallback(直接用 input)',
    r.command === '/f',
    { input: state.input, command: r.command });
}

// ── 场景 11: j/k 被忽略(ref 不变) ──
{
  let state = { ...INITIAL_STATE };
  // 先按 / 激活
  state = processKey(ALL_COMMANDS, state, '/', {}).next;
  const beforeJ = { ...state };
  state = processKey(ALL_COMMANDS, state, 'j', {}).next;
  expect('场景11: j 不被消费,state 不变',
    state.input === beforeJ.input && state.showHints === beforeJ.showHints,
    { before: beforeJ, after: state });
  state = processKey(ALL_COMMANDS, state, 'k', {}).next;
  expect('场景11: k 不被消费,state 不变',
    state.input === beforeJ.input && state.showHints === beforeJ.showHints,
    { after: state });
}

// ── 场景 12: filterCommands 边界 ──
{
  expect('filterCommands 空输入 + showHints=true → 返回全部',
    filterCommands(ALL_COMMANDS, '/', true).length === ALL_COMMANDS.length);
  expect('filterCommands 空输入 + showHints=false → 返回空',
    filterCommands(ALL_COMMANDS, '/', false).length === 0);
  expect('filterCommands /server → 至少含 /server',
    filterCommands(ALL_COMMANDS, '/server', true).some(c => c.cmd === '/server'));
  expect('filterCommands /xyz → 无匹配',
    filterCommands(ALL_COMMANDS, '/xyz', true).length === 0);
}

// ── 场景 13: opencode 风格 — 按 / 唤出 + Enter 立即执行(不需键入完整指令) ──
{
  // 用户只按了 /,没继续输入,直接按 Enter
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景13: 按 / 唤出 + Enter → 立即执行 selected(默认 /server)',
    commands.length === 1 && commands[0] === '/server',
    { actual: commands });
}

// ── 场景 14: opencode 风格 — / + ↓ + Enter 选中第二条(/stop) ──
{
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: '', key: { downArrow: true } },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景14: / + ↓ + Enter → 执行 /stop',
    commands.length === 1 && commands[0] === '/stop',
    { actual: commands });
}

// ── 场景 15: opencode 风格 — /s + Enter (fuzzy 第一条) ──
{
  // 已经覆盖(场景 2),但确认 showHints 的 selected 用的是 fuzzy 第一条
  let state = { ...INITIAL_STATE };
  const commands = [];
  for (const { inp, key } of [
    { inp: '/', key: {} },
    { inp: 's', key: {} },
    { inp: '', key: { return: true } },
  ]) {
    const r = processKey(ALL_COMMANDS, state, inp, key);
    state = r.next;
    if (r.command) commands.push(r.command);
  }
  expect('场景15: /s + Enter → fuzzy 选 /server',
    commands.length === 1 && commands[0] === '/server',
    { actual: commands });
}

console.log(`\n=== 总计: ${pass} pass, ${failures} fail ===`);
if (failures > 0) {
  console.error(`\nFAIL: ${failures} 个断言失败`);
  process.exit(1);
}
console.log('\nPASS: 全部 processKey 场景通过');
