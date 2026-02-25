#!/usr/bin/env node
/**
 * Build script: dbf-tool.js → obfuscated standalone Windows executable
 *
 * Steps:
 *  1. esbuild — bundle dbf-tool.js + all node_modules into dist/bundle.js
 *  2. javascript-obfuscator — obfuscate bundle → dist/bundle.obf.js
 *  3. @yao-pkg/pkg — package into dist/dbf-tool.exe (self-contained, no Node.js required)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "dist");
if (!fs.existsSync(dist)) fs.mkdirSync(dist);

// ── Step 1: Bundle ──────────────────────────────────────────────────────────
console.log("📦 [1/3] Bundling with esbuild...");
execSync(
  [
    "npx esbuild dbf-tool.js",
    "--bundle",
    "--platform=node",
    "--target=node22",
    "--outfile=dist/bundle.js",
  ].join(" "),
  { stdio: "inherit", cwd: __dirname }
);

// ── Step 2: Obfuscate ───────────────────────────────────────────────────────
console.log("🔒 [2/3] Obfuscating...");
const JavaScriptObfuscator = require("javascript-obfuscator");
const source = fs.readFileSync(path.join(dist, "bundle.js"), "utf8");

const result = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.3,
  deadCodeInjection: false,
  numbersToExpressions: false,
  simplify: true,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: "function",
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  // selfDefending breaks in Node.js — keep off
  selfDefending: false,
  disableConsoleOutput: false,
  // Preserve shebang target compatibility
  target: "node",
});

const obfPath = path.join(dist, "bundle.obf.js");
fs.writeFileSync(obfPath, result.getObfuscatedCode());
console.log(`   Written: dist/bundle.obf.js (${(fs.statSync(obfPath).size / 1024).toFixed(1)} KB)`);

// ── Step 3: Package ─────────────────────────────────────────────────────────
console.log("🚀 [3/3] Packaging exe with @yao-pkg/pkg...");
execSync(
  [
    "npx pkg dist/bundle.obf.js",
    "--targets node22-win-x64",
    "--output dist/dbf-tool.exe",
    "--compress GZip",
  ].join(" "),
  { stdio: "inherit", cwd: __dirname }
);

const exeSize = (fs.statSync(path.join(dist, "dbf-tool.exe")).size / (1024 * 1024)).toFixed(1);
console.log(`\n✅ Done! dist/dbf-tool.exe (${exeSize} MB)`);
console.log("   Usage: .\\dist\\dbf-tool.exe --help");
console.log("   Note:  Place a .env file next to the exe for API_URL / SYNC_API_KEY.");
