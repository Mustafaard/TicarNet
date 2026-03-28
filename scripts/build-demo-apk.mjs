import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android");
const isWindows = process.platform === "win32";
const gradleExternalBuildRoot = path.join(
  process.env.TEMP || process.env.TMPDIR || process.env.TMP || "C:/Temp",
  "ticarnet-android-gradle",
);

const npmCmd = isWindows ? "npm.cmd" : "npm";
const npxCmd = isWindows ? "npx.cmd" : "npx";
const gradleCmd = isWindows ? "gradlew.bat" : "./gradlew";

function fail(message) {
  console.error(`\n[apk:build:demo] ${message}`);
  process.exit(1);
}

function run(command, args, cwd = projectRoot) {
  const cmdText = `${command} ${args.join(" ")}`.trim();
  console.log(`\n[apk:build:demo] > ${cmdText}`);
  const needsShell =
    isWindows &&
    (command === npmCmd || command === npxCmd || command.toLowerCase().endsWith(".bat"));

  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: needsShell,
  });

  if (result.error) {
    fail(`${cmdText}\n${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${cmdText}\nKomut basarisiz oldu.`);
  }
}

function toMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function writeSha256(filePath) {
  const hash = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  const outPath = `${filePath}.sha256`;
  const line = `${hash}  ${path.basename(filePath)}\n`;
  fs.writeFileSync(outPath, line, "utf8");
  return outPath;
}

function resolveLatestApkPath() {
  const candidates = [
    path.join(
      gradleExternalBuildRoot,
      "app",
      "outputs",
      "apk",
      "debug",
      "app-debug.apk",
    ),
    path.join(
      androidRoot,
      "app",
      "build",
      "outputs",
      "apk",
      "debug",
      "app-debug.apk",
    ),
  ];

  const existing = candidates
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => ({ candidate, mtimeMs: fs.statSync(candidate).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (existing.length === 0) {
    fail(
      `APK bulunamadi.\nBeklenen yollardan hicbiri yok:\n- ${candidates.join("\n- ")}`,
    );
  }

  return existing[0].candidate;
}

function writeMinimalLiveShell(liveUrl) {
  const distDir = path.join(projectRoot, "dist");
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  const html = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TicarNet Online</title>
    <style>
      body{margin:0;display:grid;place-items:center;min-height:100vh;background:#06142b;color:#e2e8f0;font-family:Segoe UI,Tahoma,sans-serif}
      .card{text-align:center;padding:24px}
    </style>
  </head>
  <body>
    <section class="card">
      <h1>TicarNet Online</h1>
      <p>Canli sunucuya baglaniyor: ${liveUrl}</p>
    </section>
  </body>
</html>
`;
  fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");
  console.log(`[apk:build:demo] Live shell hazirlandi: ${distDir}`);
}

function buildVersionMeta(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const versionCode = Number(`${yyyy}${mm}${dd}${hh}`);
  const versionName = `${yyyy}.${mm}.${dd}-${hh}${min}`;
  return { versionCode, versionName };
}

function main() {
  const liveUrl = process.env.CAP_SERVER_URL || "https://ticarnet.tr";
  const { versionCode, versionName } = buildVersionMeta();
  run("node", ["scripts/write-capacitor-config.mjs", "live", liveUrl]);
  writeMinimalLiveShell(liveUrl);
  run(npxCmd, ["cap", "sync", "android"]);
  run("node", ["scripts/sync-android-app-icon.mjs"]);
  run("node", ["scripts/normalize-android-assets.mjs"]);
  run(
    gradleCmd,
    [
      "clean",
      "assembleDebug",
      `-PTICARNET_VERSION_CODE=${versionCode}`,
      `-PTICARNET_VERSION_NAME=${versionName}`,
      "--no-daemon",
    ],
    androidRoot,
  );

  const debugApkPath = resolveLatestApkPath();

  const releaseDir = path.join(projectRoot, "release");
  fs.mkdirSync(releaseDir, { recursive: true });

  const outApkPath = path.join(releaseDir, "ticarnet-demo-debug.apk");
  fs.copyFileSync(debugApkPath, outApkPath);

  const apkStats = fs.statSync(outApkPath);
  const shaPath = writeSha256(outApkPath);

  console.log("\n[apk:build:demo] Tamamlandi.");
  console.log(`[apk:build:demo] Mod: live (${liveUrl})`);
  console.log(`[apk:build:demo] Android versionCode: ${versionCode}`);
  console.log(`[apk:build:demo] Android versionName: ${versionName}`);
  console.log(`[apk:build:demo] Kaynak debug APK: ${debugApkPath}`);
  console.log(`[apk:build:demo] APK: ${outApkPath}`);
  console.log(`[apk:build:demo] Boyut: ${toMb(apkStats.size)} MB`);
  console.log(`[apk:build:demo] SHA256: ${shaPath}`);
}

main();
