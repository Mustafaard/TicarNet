import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const IS_WINDOWS = process.platform === "win32";
const NPM_CMD = IS_WINDOWS ? "npm.cmd" : "npm";
const NPX_CMD = IS_WINDOWS ? "npx.cmd" : "npx";

function fail(message) {
  console.error(`\n[android:auto] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const printable = `${command} ${args.join(" ")}`.trim();
  console.log(`\n[android:auto] > ${printable}`);
  const needsShell = IS_WINDOWS && (command === NPM_CMD || command === NPX_CMD);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: needsShell,
    ...options,
  });

  if (result.error) {
    fail(`Komut çalıştırılamadı: ${printable}\n${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`Komut çalıştırılamadı: ${printable}\n${result.error?.message || "Komut başarısız oldu."}`);
  }
}

function read(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout ?? "";
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function resolveSdkRoot() {
  const candidates = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  fail("Android SDK bulunamadı. Android Studio içinde SDK kurulu olmalıdır.");
}

function resolveTool(sdkRoot, relativePath) {
  const toolPath = path.join(sdkRoot, ...relativePath);
  if (!fs.existsSync(toolPath)) {
    fail(`${relativePath.join("/")} bulunamadı: ${toolPath}`);
  }
  return toolPath;
}

function parseConnectedDevices(adbPath) {
  const output = read(adbPath, ["devices"]);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === "device")
    .map((parts) => parts[0]);
}

function getBootStatus(adbPath, serial) {
  return read(adbPath, ["-s", serial, "shell", "getprop", "sys.boot_completed"]).trim();
}

function waitForReadyDevice(adbPath, timeoutMs = 240000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const devices = parseConnectedDevices(adbPath);
    if (devices.length > 0) {
      const preferred = devices.find((device) => device.startsWith("emulator-")) ?? devices[0];
      const boot = getBootStatus(adbPath, preferred);
      if (boot === "1") {
        return preferred;
      }
    }
    sleep(3000);
  }

  fail("Cihaz hazır olmadı. Emülatöre veya telefona bağlanıp tekrar deneyin.");
}

function selectAvdName(emulatorPath) {
  const preferred = process.env.AVD_NAME?.trim();
  const avdLines = read(emulatorPath, ["-list-avds"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (avdLines.length === 0) {
    fail("AVD yok. Android Studio > Device Manager > Create Device ile bir emülatör oluşturun.");
  }

  if (preferred && avdLines.includes(preferred)) {
    return preferred;
  }

  return avdLines[0];
}

function isEmulatorRunning(adbPath) {
  return parseConnectedDevices(adbPath).some((device) => device.startsWith("emulator-"));
}

function startEmulatorIfNeeded(emulatorPath, adbPath, avdName) {
  if (isEmulatorRunning(adbPath)) {
    console.log("[android:auto] Emülatör zaten açık.");
    return;
  }

  console.log(`[android:auto] Emülatör başlatılıyor: ${avdName}`);
  const child = spawn(emulatorPath, ["-avd", avdName], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function main() {
  const projectRoot = process.cwd();
  const sdkRoot = resolveSdkRoot();
  const adbPath = resolveTool(sdkRoot, [
    "platform-tools",
    IS_WINDOWS ? "adb.exe" : "adb",
  ]);
  const emulatorPath = resolveTool(sdkRoot, [
    "emulator",
    IS_WINDOWS ? "emulator.exe" : "emulator",
  ]);

  run(adbPath, ["start-server"]);
  run(NPM_CMD, ["run", "android:sync"], { cwd: projectRoot });
  run(NPX_CMD, ["cap", "open", "android"], { cwd: projectRoot });

  const avdName = selectAvdName(emulatorPath);
  startEmulatorIfNeeded(emulatorPath, adbPath, avdName);

  const serial = waitForReadyDevice(adbPath);
  console.log(`[android:auto] Hazır cihaz: ${serial}`);

  run(NPM_CMD, ["run", "android:install"], { cwd: projectRoot });
  run(NPM_CMD, ["run", "android:launch"], { cwd: projectRoot });

  console.log("\n[android:auto] Oyun emülatörde açıldı.");
}

main();
