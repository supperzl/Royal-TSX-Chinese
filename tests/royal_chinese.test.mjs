import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDir, "..");
const scriptPath = path.join(repositoryRoot, "scripts", "royal_chinese.mjs");
const templateVersion = "6.3.0.1000";
const latestTemplateVersion = "6.4.3.1000";
const targetFiles = [
  "Contents/Resources/zh-Hans.lproj/Localizable.strings",
  "Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/index.html",
  "Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/js/language.js",
  "Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/js/language_zh.js",
];

function createFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "royal-chinese-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const projectRoot = path.join(root, "project");
  const appPath = path.join(root, "Royal TSX.app");
  const sourceTemplate = path.join(repositoryRoot, "templates", templateVersion);
  const fixtureTemplate = path.join(projectRoot, "templates", templateVersion);
  fs.cpSync(sourceTemplate, fixtureTemplate, { recursive: true });
  fs.cpSync(
    path.join(repositoryRoot, "templates", latestTemplateVersion),
    path.join(projectRoot, "templates", latestTemplateVersion),
    { recursive: true },
  );

  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleShortVersionString</key><string>6.4.3</string>
  <key>CFBundleVersion</key><string>6.4.3.1000</string>
</dict></plist>
`;
  fs.mkdirSync(path.join(appPath, "Contents"), { recursive: true });
  fs.writeFileSync(path.join(appPath, "Contents", "Info.plist"), infoPlist);

  for (const relativePath of targetFiles) {
    const targetPath = path.join(appPath, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, `original:${relativePath}`);
  }

  return { appPath, fixtureTemplate, projectRoot };
}

function runCli({ appPath, projectRoot }) {
  return spawnSync(
    process.execPath,
    [scriptPath, "--app", appPath, "--version", templateVersion],
    {
      encoding: "utf8",
      env: { ...process.env, ROYAL_CHINESE_PROJECT_ROOT: projectRoot },
    },
  );
}

function runDefaultDryRun({ appPath, projectRoot }) {
  return spawnSync(process.execPath, [scriptPath, "--app", appPath, "--dry-run"], {
    encoding: "utf8",
    env: { ...process.env, ROYAL_CHINESE_PROJECT_ROOT: projectRoot },
  });
}

test("applies a template with a valid manifest and backs up every target", (t) => {
  const fixture = createFixture(t);

  const result = runCli(fixture);

  assert.equal(result.status, 0, result.stderr);
  for (const relativePath of targetFiles) {
    assert.deepEqual(
      fs.readFileSync(path.join(fixture.appPath, relativePath)),
      fs.readFileSync(path.join(fixture.fixtureTemplate, relativePath)),
    );
  }

  const backupRuns = fs.readdirSync(path.join(fixture.projectRoot, "backups"));
  assert.equal(backupRuns.length, 1);
  for (const relativePath of targetFiles) {
    const absoluteTarget = path.join(fixture.appPath, relativePath);
    const backupPath = path.join(
      fixture.projectRoot,
      "backups",
      backupRuns[0],
      path.relative("/", absoluteTarget),
    );
    assert.equal(fs.readFileSync(backupPath, "utf8"), `original:${relativePath}`);
  }
});

test("rejects a checksum mismatch before changing the app", (t) => {
  const fixture = createFixture(t);
  const corruptedRelativePath = targetFiles[0];
  fs.appendFileSync(path.join(fixture.fixtureTemplate, corruptedRelativePath), "corrupted");

  const result = runCli(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /checksum mismatch/i);
  for (const relativePath of targetFiles) {
    assert.equal(
      fs.readFileSync(path.join(fixture.appPath, relativePath), "utf8"),
      `original:${relativePath}`,
    );
  }
  assert.equal(fs.existsSync(path.join(fixture.projectRoot, "backups")), false);
});

test("uses the 6.4.3.1000 template by default", (t) => {
  const fixture = createFixture(t);

  const result = runDefaultDryRun(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /模板版本: 6\.4\.3\.1000/);
});
