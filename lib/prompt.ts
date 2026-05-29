/**
 * 简单的交互式提示工具（基于 readline，无额外依赖）
 */
import * as readline from 'readline';

function ask(question: string, choices: string[], defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const suffix = defaultValue !== undefined ? ` [${defaultValue}]` : '';
    rl.question(`  ${question}${suffix}: `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed === '' && defaultValue !== undefined ? defaultValue : trimmed);
    });
  });
}

function confirm(question: string, defaults: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const def = defaults ? '[Y/n]' : '[y/N]';
    rl.question(`  ${question} ${def}: `, (answer) => {
      rl.close();
      if (!answer.trim()) return resolve(defaults);
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

function select(question: string, choices: string[]): Promise<number> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`  ${question}:`);
    choices.forEach((c, i) => console.log(`    ${i + 1}. ${c}`));
    const def = choices.length === 2 ? '1' : '';
    rl.question(`  选择 [${def}]: `, (answer) => {
      rl.close();
      const idx = parseInt(answer.trim()) - 1;
      if (!answer.trim() && def) {
        return resolve(0);
      }
      if (isNaN(idx) || idx < 0 || idx >= choices.length) {
        console.log('  无效选择，使用默认。');
        return resolve(0);
      }
      resolve(idx);
    });
  });
}

export { ask, confirm, select };