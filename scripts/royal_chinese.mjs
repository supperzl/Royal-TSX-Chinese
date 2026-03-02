#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_APP_PATH = "/Applications/Royal TSX.app";
const PLACEHOLDER_RE = /(%(?:\d+\$)?[@dfs]|\{\d+\}|\$[A-Za-z0-9_]+\$|\[\[\[[^\]]+\]\]\])/g;

const HARD_SKIP_AUTO_TRANSLATE = new Set([
  "VNC",
  "SSH",
  "Telnet",
  "VPN",
  "URI",
  "URL",
  "ID",
  "OS X",
  "macOS",
  "TeamViewer",
  "Hyper-V",
  "PowerShell",
  "Amazon Web Services",
  "Bonjour",
  "Royal TSX",
  "Royal Server",
  "RDP",
  "CSV",
  "AWS",
  "EC2",
  "vSSH",
]);

const PLUGIN_GALLERY_LANGUAGE_ZH = `/*
\tSIMPLIFIED CHINESE LANGUAGE FILE
*/

var language_file_zh = {
\t"Loading" : "加载中",
\t"Installed Plugins" : "已安装插件",
\t"Available Plugins" : "可用插件",
\t"No Updates available" : "没有可用更新",
\t"{0} Update(s) available" : "有 {0} 个可用更新",
\t"Update all" : "全部更新",
\t"Less" : "收起",
\t"More" : "更多",
\t"Install" : "安装",
\t"Install All" : "全部安装",
\t"Uninstall" : "卸载",
\t"License" : "许可证",
\t"by" : "作者",
\t"Update" : "更新",
\t"ToUpdate" : "更新",
\t"Version" : "版本",
\t"An error occurred" : "发生错误",
\t"You currently have no plugins installed." : "当前没有已安装插件。",
\t"Switch to the 'Available Plugins' tab to start installing." : "切换到“可用插件”标签开始安装。",
\t"There are currently no plugins available." : "当前没有可用插件。",
\t"You might have to update the main application." : "你可能需要先更新主程序。",
\t"Warning" : "警告",
\t"OK" : "确定",
\t"Client Side Error" : "客户端错误",
\t"Visit Website" : "访问网站",
\t"Get Support" : "获取支持",
\t"Release Notes" : "更新说明",
\t"More Information" : "了解更多"
};
`;

const LANGUAGE_JS_PATCHED = `var language = {
\tcurrentLanguage: "en",
\tcurrentLanguageContent: null,

\tinit: function (initialLanguage) {
\t\tlanguage.activeLanguage(initialLanguage);
\t},

\tnormalizeLanguageCode: function (languageCode) {
\t\tif (!languageCode) {
\t\t\treturn "en";
\t\t}

\t\ttry {
\t\t\tvar normalized = String(languageCode).toLowerCase().replace("_", "-").split("-")[0];
\t\t\tif (!normalized) {
\t\t\t\treturn "en";
\t\t\t}

\t\t\tif (normalized === "zh") {
\t\t\t\treturn "zh";
\t\t\t}

\t\t\tif (normalized === "de") {
\t\t\t\treturn "de";
\t\t\t}

\t\t\tif (normalized === "en") {
\t\t\t\treturn "en";
\t\t\t}

\t\t\treturn "en";
\t\t} catch (ex) {
\t\t\treturn "en";
\t\t}
\t},

\tactiveLanguage: function (newActiveLanguage) {
\t\tif (newActiveLanguage) {
\t\t\ttry {
\t\t\t\tvar normalizedLanguage = language.normalizeLanguageCode(newActiveLanguage);
\t\t\t\tlanguage.currentLanguageContent = eval("language_file_" + normalizedLanguage);
\t\t\t\tlanguage.currentLanguage = normalizedLanguage;
\t\t\t} catch (ex) {
\t\t\t\tlanguage.currentLanguage = "en";
\t\t\t\tlanguage.currentLanguageContent = eval("language_file_" + language.currentLanguage);
\t\t\t}
\t\t}

\t\treturn language.currentLanguage;
\t},

\tget: function (text) {
\t\tif (language.currentLanguageContent == null ||
\t\t\t!language.currentLanguageContent.hasOwnProperty(text)) {
\t\t\treturn text;
\t\t}

\t\treturn language.currentLanguageContent[text];
\t},

\tformatString: function (str) {
\t\tfor (i = 1; i < arguments.length; i++) {
\t\t\tstr = str.replace("{" + (i - 1) + "}", arguments[i]);
\t\t}

\t\treturn str;
\t},

\tgetFormat: function (text, args) {
\t\ttext = language.get(text);

\t\ttry {
\t\t\ttext = language.formatString(text, args);
\t\t} catch (ex) { }

\t\treturn text;
\t}
};
`;

function usage() {
  console.log(`Usage: royal_chinese.sh [options]

Options:
  --app <path>       Royal TSX.app path (default: ${DEFAULT_APP_PATH})
  --no-auto          Disable online auto-translation (only use overrides)
  --dry-run          Analyze and generate report only; do not write files
  --help             Show this help
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    appPath: DEFAULT_APP_PATH,
    autoTranslate: true,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--app") {
      const appPath = args[i + 1];
      if (!appPath) {
        throw new Error("Missing value for --app");
      }
      options.appPath = appPath;
      i += 1;
      continue;
    }

    if (arg === "--no-auto") {
      options.autoTranslate = false;
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

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureRequiredFiles(paths) {
  const missing = paths.filter((p) => !exists(p));
  if (missing.length > 0) {
    throw new Error(`Required files not found:\n${missing.map((p) => `  - ${p}`).join("\n")}`);
  }
}

function decodeEscapes(str) {
  return str
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function escapeForStrings(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');
}

function parseStrings(content) {
  const map = new Map();
  const re = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const key = decodeEscapes(match[1]);
    const value = decodeEscapes(match[2]);
    map.set(key, value);
  }
  return map;
}

function containsCjk(text) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(text);
}

function looksEnglishWithoutCjk(text) {
  return !containsCjk(text) && /[A-Za-z]/.test(text);
}

function getPlaceholderSignature(text) {
  const list = text.match(PLACEHOLDER_RE) || [];
  return list.sort().join("\u0000");
}

function normalizeTranslation(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .trim();
}

function shouldSkipAutoTranslate(key, englishValue) {
  if (HARD_SKIP_AUTO_TRANSLATE.has(englishValue)) {
    return true;
  }

  if (/^https?:\/\//i.test(englishValue)) {
    return true;
  }

  if (/^[A-Z0-9_\-.]+$/.test(englishValue)) {
    return true;
  }

  if (key.startsWith("Key_") && englishValue.length <= 12) {
    return true;
  }

  return false;
}

async function translateWithGoogle(text) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "zh-CN");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept": "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const parts = Array.isArray(data?.[0]) ? data[0].map((item) => item?.[0] ?? "") : [];
  return parts.join("");
}

async function translateWithRetry(text, retries = 3) {
  let lastError = null;
  for (let i = 0; i < retries; i += 1) {
    try {
      return await translateWithGoogle(text);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 + i * 350));
    }
  }
  throw lastError;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function runWorker() {
    while (true) {
      const index = currentIndex;
      if (index >= items.length) {
        return;
      }

      currentIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = [];
  const workerCount = Math.min(limit, Math.max(1, items.length));
  for (let i = 0; i < workerCount; i += 1) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  return results;
}

function backupFile(filePath, backupRoot) {
  if (!exists(filePath)) {
    return;
  }
  const relative = path.relative("/", filePath);
  const backupPath = path.join(backupRoot, relative);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

function patchLocalizableContent(zhContent, updates) {
  const lineRe = /("((?:\\.|[^"\\])*)"\s*=\s*")((?:\\.|[^"\\])*)(";\s*(?:\/\/[^\n]*)?)/g;

  return zhContent.replace(lineRe, (full, prefix, rawKey, rawValue, suffix) => {
    const key = decodeEscapes(rawKey);
    if (!updates.has(key)) {
      return full;
    }

    const translatedValue = updates.get(key);
    const escapedValue = escapeForStrings(translatedValue);
    return `${prefix}${escapedValue}${suffix}`;
  });
}

function countSameAsEnglish(enMap, zhMap) {
  let count = 0;
  for (const [key, enValue] of enMap.entries()) {
    const zhValue = zhMap.get(key);
    if (!zhValue) {
      count += 1;
      continue;
    }

    if (zhValue === enValue) {
      count += 1;
    }
  }
  return count;
}

function countEnglishLike(enMap, zhMap) {
  let count = 0;
  for (const [key] of enMap.entries()) {
    const zhValue = zhMap.get(key);
    if (!zhValue) {
      count += 1;
      continue;
    }

    if (looksEnglishWithoutCjk(zhValue)) {
      count += 1;
    }
  }
  return count;
}

function loadJsonIfExists(jsonPath, fallbackValue) {
  if (!exists(jsonPath)) {
    return fallbackValue;
  }

  const raw = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(raw);
}

function saveJson(jsonPath, value) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function patchPluginGallery(indexHtmlPath, languageJsPath, languageZhPath, dryRun) {
  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  if (!indexHtml.includes("js/language_zh.js")) {
    if (indexHtml.includes("js/language_de.js")) {
      indexHtml = indexHtml.replace(
        '<script type="text/javascript" src="js/language_de.js"></script>',
        '<script type="text/javascript" src="js/language_de.js"></script>\n\t<script type="text/javascript" src="js/language_zh.js"></script>',
      );
    } else if (indexHtml.includes("js/language_en.js")) {
      indexHtml = indexHtml.replace(
        '<script type="text/javascript" src="js/language_en.js"></script>',
        '<script type="text/javascript" src="js/language_en.js"></script>\n\t<script type="text/javascript" src="js/language_zh.js"></script>',
      );
    }
  }

  if (!dryRun) {
    fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");
    fs.writeFileSync(languageJsPath, LANGUAGE_JS_PATCHED, "utf8");
    fs.writeFileSync(languageZhPath, PLUGIN_GALLERY_LANGUAGE_ZH, "utf8");
  }
}

async function main() {
  const options = parseArgs();

  const localizableEnPath = path.join(options.appPath, "Contents", "Resources", "en.lproj", "Localizable.strings");
  const localizableZhPath = path.join(options.appPath, "Contents", "Resources", "zh-Hans.lproj", "Localizable.strings");

  const pluginGalleryDir = path.join(
    options.appPath,
    "Contents",
    "Frameworks",
    "RoyalTSXNativeUI.framework",
    "Versions",
    "A",
    "Resources",
    "PluginGallery",
  );

  const pluginIndexPath = path.join(pluginGalleryDir, "index.html");
  const pluginLanguageJsPath = path.join(pluginGalleryDir, "js", "language.js");
  const pluginLanguageZhPath = path.join(pluginGalleryDir, "js", "language_zh.js");

  ensureRequiredFiles([
    localizableEnPath,
    localizableZhPath,
    pluginIndexPath,
    pluginLanguageJsPath,
  ]);

  const overridesPath = path.join(projectRoot, "translations", "localizable-overrides.json");
  const cachePath = path.join(projectRoot, "translations", "google-cache.json");

  const overrides = loadJsonIfExists(overridesPath, {});
  const translateCache = loadJsonIfExists(cachePath, {});

  const enContent = fs.readFileSync(localizableEnPath, "utf8");
  const zhContent = fs.readFileSync(localizableZhPath, "utf8");

  const enMap = parseStrings(enContent);
  const zhMap = parseStrings(zhContent);

  const beforeSameAsEnglish = countSameAsEnglish(enMap, zhMap);
  const beforeEnglishLike = countEnglishLike(enMap, zhMap);

  const updates = new Map();
  const toTranslate = [];
  let overrideUsed = 0;

  for (const [key, enValue] of enMap.entries()) {
    const currentZh = zhMap.get(key);

    const isCandidate = !currentZh || currentZh === enValue || looksEnglishWithoutCjk(currentZh);
    if (!isCandidate) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      updates.set(key, overrides[key]);
      overrideUsed += 1;
      continue;
    }

    if (!options.autoTranslate || shouldSkipAutoTranslate(key, enValue)) {
      continue;
    }

    toTranslate.push({ key, enValue, currentZh: currentZh ?? "" });
  }

  let autoTranslatedCount = 0;
  let autoFailedCount = 0;

  if (options.autoTranslate && toTranslate.length > 0) {
    console.log(`Auto-translating ${toTranslate.length} entries...`);

    await mapLimit(toTranslate, 6, async ({ key, enValue }) => {
      const cacheKey = enValue;
      let translated = translateCache[cacheKey];

      if (!translated) {
        try {
          translated = await translateWithRetry(enValue);
          translated = normalizeTranslation(translated);
          if (translated) {
            translateCache[cacheKey] = translated;
          }
        } catch {
          autoFailedCount += 1;
          return;
        }
      }

      if (!translated) {
        autoFailedCount += 1;
        return;
      }

      if (getPlaceholderSignature(enValue) !== getPlaceholderSignature(translated)) {
        autoFailedCount += 1;
        return;
      }

      updates.set(key, translated);
      autoTranslatedCount += 1;
    });
  }

  let finalLocalizableContent = zhContent;

  if (updates.size > 0) {
    finalLocalizableContent = patchLocalizableContent(zhContent, updates);
  }

  const newZhMap = parseStrings(finalLocalizableContent);

  const afterSameAsEnglish = countSameAsEnglish(enMap, newZhMap);
  const afterEnglishLike = countEnglishLike(enMap, newZhMap);

  const backupRoot = path.join(projectRoot, "backups", timestamp());

  if (!options.dryRun) {
    fs.mkdirSync(backupRoot, { recursive: true });

    backupFile(localizableZhPath, backupRoot);
    backupFile(pluginIndexPath, backupRoot);
    backupFile(pluginLanguageJsPath, backupRoot);
    backupFile(pluginLanguageZhPath, backupRoot);

    fs.writeFileSync(localizableZhPath, finalLocalizableContent, "utf8");

    patchPluginGallery(pluginIndexPath, pluginLanguageJsPath, pluginLanguageZhPath, false);
    saveJson(cachePath, translateCache);
  }

  console.log("\nRoyal TSX 汉化结果:");
  console.log(`- App 路径: ${options.appPath}`);
  console.log(`- 模式: ${options.dryRun ? "dry-run" : "apply"}`);
  console.log(`- 使用覆盖词条: ${overrideUsed}`);
  console.log(`- 自动翻译成功: ${autoTranslatedCount}`);
  console.log(`- 自动翻译失败: ${autoFailedCount}`);
  console.log(`- 译文更新总数: ${updates.size}`);
  console.log(`- 同英文词条: ${beforeSameAsEnglish} -> ${afterSameAsEnglish}`);
  console.log(`- 英文样式词条: ${beforeEnglishLike} -> ${afterEnglishLike}`);

  if (!options.dryRun) {
    console.log(`- 备份目录: ${backupRoot}`);
    console.log("\n已写入安装版 App，重启 Royal TSX 后生效。");
  } else {
    console.log("\nDry-run 未改动任何文件。");
  }
}

main().catch((error) => {
  console.error(`\n执行失败: ${error.message}`);
  process.exit(1);
});
