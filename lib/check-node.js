#!/usr/bin/env node
/**
 * Node 版本检测
 */
const MIN_VERSION = 18;

function checkNodeVersion() {
  const version = process.version.slice(1); // 去掉 'v'
  const [major] = version.split('.').map(Number);
  if (major < MIN_VERSION) {
    console.error(`\n⛔ 错误: 需要 Node.js >=${MIN_VERSION}，当前版本为 ${version}\n`);
    console.error('升级指南:');
    console.error('  • macOS/Linux:  nvm install 18 && nvm use 18');
    console.error('  • 或者:         n npm install -g n && n 18');
    console.error('  • Windows:      https://nodejs.org 下载最新 LTS 版\n');
    process.exit(1);
  }
  return true;
}

module.exports = { checkNodeVersion, MIN_VERSION };