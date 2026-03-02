#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_TEMPLATE_VERSION = "6.3.0.1000";
const DEFAULT_APP_CANDIDATES = [
  "/Applications/Royal TSX.app",
  path.join(os.homedir(), "Applications", "Royal TSX.app"),
];

const TARGET_FILES = [
  "Contents/Resources/zh-Hans.lproj/Localizable.strings",
  "Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/index.html",
  "Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/js/language.js",
  "Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/js/language_zh.js",
];

function usage() {
  console.log(`Usage: royal_chinese.sh [options]

Options:
  --app <path>       指定 Royal TSX.app 路径（默认自动识别）
  --version <ver>    使用模板版本（默认: ${DEFAULT_TEMPLATE_VERSION}）
  --dry-run          只预览，不写入
  --help             显示帮助
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    appPath: "",
    templateVersion: DEFAULT_TEMPLATE_VERSION,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--app") {
      const value = args[i + 1];
      if (!value) {
        throw new Error("Missing value for --app");
      }
      options.appPath = value;
      i += 1;
      continue;
    }

    if (arg === "--version") {
      const value = args[i + 1];
      if (!value) {
        throw new Error("Missing value for --version");
      }
      options.templateVersion = value;
      i += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureFilesExist(paths, label) {
  const missing = paths.filter((item) => !exists(item));
  if (missing.length > 0) {
    throw new Error(`${label} missing:\n${missing.map((item) => `  - ${item}`).join("\n")}`);
  }
}

function getTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function resolveAppPath(inputPath) {
  if (inputPath) {
    return path.resolve(inputPath);
  }

  for (const candidate of DEFAULT_APP_CANDIDATES) {
    if (exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Royal TSX.app not found. Please pass --app <path>. Tried:\n${DEFAULT_APP_CANDIDATES.map((item) => `  - ${item}`).join("\n")}`,
  );
}

function readAppVersion(appPath, key) {
  try {
    const infoPlist = path.join(appPath, "Contents", "Info.plist");
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, infoPlist], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function copyFileWithDirs(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function backupIfExists(targetPath, backupRoot) {
  if (!exists(targetPath)) {
    return false;
  }

  const relative = path.relative("/", targetPath);
  const backupPath = path.join(backupRoot, relative);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(targetPath, backupPath);
  return true;
}

function main() {
  const options = parseArgs();
  const appPath = resolveAppPath(options.appPath);

  const templateRoot = path.join(projectRoot, "templates", options.templateVersion);
  const sourcePaths = TARGET_FILES.map((item) => path.join(templateRoot, item));
  ensureFilesExist(sourcePaths, "Template files");

  const infoPlist = path.join(appPath, "Contents", "Info.plist");
  if (!exists(infoPlist)) {
    throw new Error(`Invalid app bundle: ${appPath}`);
  }

  const appShortVersion = readAppVersion(appPath, "CFBundleShortVersionString");
  const appBuildVersion = readAppVersion(appPath, "CFBundleVersion");

  const backupRoot = path.join(projectRoot, "backups", getTimestamp());
  let backedUpCount = 0;
  let copiedCount = 0;
  let createdCount = 0;

  for (let i = 0; i < TARGET_FILES.length; i += 1) {
    const relativePath = TARGET_FILES[i];
    const sourcePath = sourcePaths[i];
    const targetPath = path.join(appPath, relativePath);

    const targetExisted = exists(targetPath);

    if (!options.dryRun) {
      if (backupIfExists(targetPath, backupRoot)) {
        backedUpCount += 1;
      }
      copyFileWithDirs(sourcePath, targetPath);
    }

    copiedCount += 1;
    if (!targetExisted) {
      createdCount += 1;
    }
  }

  console.log("\nRoyal TSX 汉化替换结果:");
  console.log(`- App 路径: ${appPath}`);
  console.log(`- 模板版本: ${options.templateVersion}`);
  console.log(`- App 版本: ${appShortVersion || "unknown"} (${appBuildVersion || "unknown"})`);
  console.log(`- 模式: ${options.dryRun ? "dry-run" : "apply"}`);
  console.log(`- 覆盖文件数: ${copiedCount}`);
  console.log(`- 新建文件数: ${createdCount}`);

  if (!options.dryRun) {
    console.log(`- 备份文件数: ${backedUpCount}`);
    console.log(`- 备份目录: ${backupRoot}`);

    if (appBuildVersion && appBuildVersion !== options.templateVersion) {
      console.log(`- 提示: 当前 App 构建号为 ${appBuildVersion}，模板版本为 ${options.templateVersion}，请确认兼容性。`);
    }

    console.log("\n已完成替换。请重启 Royal TSX 生效。");
  } else {
    if (appBuildVersion && appBuildVersion !== options.templateVersion) {
      console.log(`- 提示: 当前 App 构建号为 ${appBuildVersion}，模板版本为 ${options.templateVersion}，请确认兼容性。`);
    }
    console.log("\nDry-run 未改动任何文件。");
  }
}

try {
  main();
} catch (error) {
  console.error(`\n执行失败: ${error.message}`);
  process.exit(1);
}
