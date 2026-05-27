#!/usr/bin/env node
/**
 * 简单的交互式提示工具（基于 readline，无额外依赖）
 */
const readline = require('readline');

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${question}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function confirm(question, defaults) {
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

function select(question, choices) {
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

module.exports = { ask, confirm, select };