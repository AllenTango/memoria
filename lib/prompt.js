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
exports.ask = ask;
exports.confirm = confirm;
exports.select = select;
/**
 * 简单的交互式提示工具（基于 readline，无额外依赖）
 */
const readline = __importStar(require("readline"));
function ask(question, choices, defaultValue) {
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
function confirm(question, defaults) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const def = defaults ? '[Y/n]' : '[y/N]';
        rl.question(`  ${question} ${def}: `, (answer) => {
            rl.close();
            if (!answer.trim())
                return resolve(defaults);
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
