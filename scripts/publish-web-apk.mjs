import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const idx = args.findIndex((a) => a === name);
  if (idx === -1) {
    return fallback;
  }
  return args[idx + 1] ?? fallback;
}

const sourcePath = path.resolve(
  projectRoot,
  readArg("--source", "release/ticarnet-demo-debug.apk")
);
const targetDir = path.resolve(projectRoot, "public/download");
const targetApkPath = path.resolve(targetDir, "ticarnet.apk");
const targetShaPath = `${targetApkPath}.sha256`;
const targetMetaPath = path.resolve(targetDir, "latest.json");
const targetLandingPath = path.resolve(targetDir, "index.html");
const publicApkUrl = "/download/ticarnet.apk";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(sourcePath))) {
    throw new Error(
      `[apk:publish:web] APK dosyasi bulunamadi.\n` +
        `Beklenen kaynak: ${sourcePath}\n` +
        `Cozum: npm run apk:build:demo veya --source ile dogru APK yolu verin.`
    );
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(sourcePath, targetApkPath);
  const stat = await fs.stat(targetApkPath);
  if (!Number.isFinite(stat.size) || stat.size <= 0) {
    throw new Error(`[apk:publish:web] Kopyalanan APK gecersiz veya bos: ${targetApkPath}`);
  }

  const apkBuffer = await fs.readFile(targetApkPath);
  const sha = createHash("sha256").update(apkBuffer).digest("hex");
  await fs.writeFile(targetShaPath, `${sha}  ticarnet.apk\n`, "utf8");

  const meta = {
    file: "ticarnet.apk",
    url: publicApkUrl,
    bytes: stat.size,
    size: formatBytes(stat.size),
    sha256: sha,
    publishedAt: new Date().toISOString(),
  };
  await fs.writeFile(targetMetaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  const landingHtml = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TicarNet Online APK Indir</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06142b;color:#e2e8f0;font-family:Segoe UI,Tahoma,sans-serif;padding:24px}
    .card{max-width:460px;width:100%;padding:24px;border-radius:16px;background:#0b1f3f;border:1px solid #1d4f91;text-align:center}
    h1{margin:0 0 10px;font-size:30px}
    p{margin:0 0 16px;color:#cbd5e1}
    a{display:inline-block;padding:12px 18px;border-radius:10px;background:#f59e0b;color:#0f172a;font-weight:700;text-decoration:none}
    small{display:block;margin-top:14px;color:#94a3b8}
  </style>
</head>
<body>
  <section class="card">
    <h1>TicarNet Online</h1>
    <p>Android uygulamasini indirmek icin tikla.</p>
    <a href="${publicApkUrl}">APK Indir</a>
    <small>Boyut: ${meta.size} | SHA256: ${sha.slice(0, 16)}...</small>
  </section>
</body>
</html>
`;

  await fs.writeFile(targetLandingPath, landingHtml, "utf8");

  console.log(`[apk:publish:web] Kaynak: ${sourcePath}`);
  console.log(`[apk:publish:web] Hedef: ${targetApkPath}`);
  console.log(`[apk:publish:web] Boyut: ${meta.size}`);
  console.log(`[apk:publish:web] SHA256: ${sha}`);
  console.log(`[apk:publish:web] URL: ${publicApkUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
