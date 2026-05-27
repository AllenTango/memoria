#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const buildCmd = `node "${path.join(rootDir, 'src', 'index.js')}" ${args.join(' ')}`;
execSync(buildCmd, { cwd: process.cwd(), stdio: 'inherit' });