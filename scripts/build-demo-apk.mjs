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

function main() {
  const liveUrl = process.env.CAP_SERVER_URL || "https://tr-159ae5.hosting.net.tr";
  run("node", ["scripts/write-capacitor-config.mjs", "live", liveUrl]);
  run(npxCmd, ["vite", "build"]);
  run(npxCmd, ["cap", "sync", "android"]);
  run("node", ["scripts/normalize-android-assets.mjs"]);
  run(gradleCmd, ["clean", "assembleDebug", "--no-daemon"], androidRoot);

  const debugApkPath = path.join(
    androidRoot,
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk",
  );

  if (!fs.existsSync(debugApkPath)) {
    fail(`APK bulunamadi: ${debugApkPath}`);
  }

  const releaseDir = path.join(projectRoot, "release");
  fs.mkdirSync(releaseDir, { recursive: true });

  const outApkPath = path.join(releaseDir, "ticarnet-demo-debug.apk");
  fs.copyFileSync(debugApkPath, outApkPath);

  const apkStats = fs.statSync(outApkPath);
  const shaPath = writeSha256(outApkPath);

  console.log("\n[apk:build:demo] Tamamlandi.");
  console.log(`[apk:build:demo] Mod: live (${liveUrl})`);
  console.log(`[apk:build:demo] APK: ${outApkPath}`);
  console.log(`[apk:build:demo] Boyut: ${toMb(apkStats.size)} MB`);
  console.log(`[apk:build:demo] SHA256: ${shaPath}`);
}

main();
