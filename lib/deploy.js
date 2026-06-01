"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = deploy;
/**
 * 部署功能 — 支持 GitHub Pages / Vercel / Netlify
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const prompt_1 = require("./prompt");
const TARGETS = ['GitHub Pages', 'Vercel', 'Netlify'];
async function deploy(siteDir) {
    if (!siteDir) {
        console.error('Error: Run this command inside a Memoria site directory.');
        process.exit(1);
    }
    const idx = await (0, prompt_1.select)('选择部署平台', TARGETS);
    const target = TARGETS[idx];
    console.log(`\n🚀 开始配置 ${target} 部署...\n`);
    switch (target) {
        case 'GitHub Pages':
            deployGitHubPages(siteDir);
            break;
        case 'Vercel':
            deployVercel(siteDir);
            break;
        case 'Netlify':
            deployNetlify(siteDir);
            break;
    }
}
function deployGitHubPages(siteDir) {
    const ghDir = path.join(siteDir, '.github', 'workflows');
    const wfPath = path.join(ghDir, 'memoria-deploy.yml');
    if (!fs.existsSync(ghDir)) {
        fs.mkdirSync(ghDir, { recursive: true });
    }
    const repoUrl = getGitRemote(siteDir);
    const repoName = repoUrl ? extractRepoName(repoUrl) : '<your-username>/<your-repo>';
    const wf = `name: GitHub Pages Deploy

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install deps
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
    fs.writeFileSync(wfPath, wf);
    console.log(`✅ 已创建 ${wfPath}`);
    console.log('\n📋 下一步:');
    console.log('  1. 将 workflows 文件推送到 GitHub');
    console.log('  2. 在仓库 Settings → Pages → Source 选择 "GitHub Actions"');
    console.log('  3. 推送 main 分支触发部署\n');
}
function deployVercel(siteDir) {
    console.log('✅ Vercel 部署指南\n');
    console.log('  1. 在项目目录运行:');
    console.log('       vercel');
    console.log('  2. 或者连接 GitHub 仓库自动部署\n');
    console.log('  构建命令:');
    console.log('       npm run build');
    console.log('  输出目录:');
    console.log('       dist');
    console.log('  文档: https://vercel.com/docs\n');
    console.log('  快速部署（非交互式）:');
    console.log('       vercel --prod\n');
}
function deployNetlify(siteDir) {
    console.log('✅ Netlify 部署指南\n');
    console.log('  方式一: Netlify CLI');
    console.log('       npm install -g netlify-cli');
    console.log('       netlify deploy --prod\n');
    console.log('  方式二: GitHub 集成');
    console.log('       1. 登录 Netlify');
    console.log('       2. "Add new site" → "Import from Git"');
    console.log('       3. 选择 GitHub 仓库\n');
    console.log('  构建设置:');
    console.log('       Build command:  npm run build');
    console.log('       Publish directory: dist');
    console.log('  文档: https://docs.netlify.com\n');
}
function getGitRemote(siteDir) {
    try {
        const remote = (0, child_process_1.execSync)('git remote get-url origin 2>/dev/null', { cwd: siteDir, encoding: 'utf-8' });
        return remote.trim();
    }
    catch {
        return null;
    }
}
function extractRepoName(repoUrl) {
    if (!repoUrl)
        return '<your-username>/<your-repo>';
    // git@github.com:user/repo.git 或 https://github.com/user/repo.git
    const match = repoUrl.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return match ? match[1] : '<your-username>/<your-repo>';
}
