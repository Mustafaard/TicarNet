import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const launcherBaseName = "ticarnet_online_launcher";
const launcherRoundName = `${launcherBaseName}_round`;
const launcherForegroundName = `${launcherBaseName}_foreground`;
const launcherBackgroundColorName = `${launcherBaseName}_background`;
const sourceIconCandidates = [
  path.resolve(projectRoot, "public", "splash", "logo.webp"),
  path.resolve(projectRoot, "public", "splash", "logo.png"),
];
const androidResDir = path.resolve(projectRoot, "android", "app", "src", "main", "res");
const androidManifestPath = path.resolve(
  projectRoot,
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml",
);
const stringsPath = path.resolve(androidResDir, "values", "strings.xml");
const iconXmlTargets = {
  launcher: path.resolve(androidResDir, "mipmap-anydpi-v26", `${launcherBaseName}.xml`),
  launcherRound: path.resolve(androidResDir, "mipmap-anydpi-v26", `${launcherRoundName}.xml`),
  backgroundColor: path.resolve(androidResDir, "values", `${launcherBackgroundColorName}.xml`),
};

const densities = [
  { dir: "mipmap-mdpi", size: 48 },
  { dir: "mipmap-hdpi", size: 72 },
  { dir: "mipmap-xhdpi", size: 96 },
  { dir: "mipmap-xxhdpi", size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

async function ensureExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeIcon(targetPath, size) {
  const sourceIconPath = await resolveSourceIconPath();
  await sharp(sourceIconPath)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
}

async function writeIconXmlTemplates() {
  const launcherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/${launcherBackgroundColorName}"/>
    <foreground android:drawable="@mipmap/${launcherForegroundName}"/>
</adaptive-icon>
`;

  const backgroundColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="${launcherBackgroundColorName}">#FFFFFF</color>
</resources>
`;

  await fs.mkdir(path.dirname(iconXmlTargets.launcher), { recursive: true });
  await fs.mkdir(path.dirname(iconXmlTargets.backgroundColor), { recursive: true });

  await fs.writeFile(iconXmlTargets.launcher, launcherXml, "utf8");
  await fs.writeFile(iconXmlTargets.launcherRound, launcherXml, "utf8");
  await fs.writeFile(iconXmlTargets.backgroundColor, backgroundColorXml, "utf8");
}

async function patchAndroidManifest() {
  if (!(await ensureExists(androidManifestPath))) {
    throw new Error(`AndroidManifest bulunamadi: ${androidManifestPath}`);
  }

  const manifest = await fs.readFile(androidManifestPath, "utf8");
  const next = manifest
    .replace(/android:icon="[^"]*"/, `android:icon="@mipmap/${launcherBaseName}"`)
    .replace(
      /android:roundIcon="[^"]*"/,
      `android:roundIcon="@mipmap/${launcherRoundName}"`,
    );
  await fs.writeFile(androidManifestPath, next, "utf8");
}

async function patchStringsFile() {
  if (!(await ensureExists(stringsPath))) {
    throw new Error(`strings.xml bulunamadi: ${stringsPath}`);
  }
  const raw = await fs.readFile(stringsPath, "utf8");
  const next = raw
    .replace(
      /<string name="app_name">[^<]*<\/string>/,
      '<string name="app_name">TicarNet Online</string>',
    )
    .replace(
      /<string name="title_activity_main">[^<]*<\/string>/,
      '<string name="title_activity_main">TicarNet Online</string>',
    );
  await fs.writeFile(stringsPath, next, "utf8");
}

let resolvedSourceIconPath = null;
async function resolveSourceIconPath() {
  if (resolvedSourceIconPath) {
    return resolvedSourceIconPath;
  }

  for (const candidate of sourceIconCandidates) {
    if (await ensureExists(candidate)) {
      resolvedSourceIconPath = candidate;
      return candidate;
    }
  }

  throw new Error(
    `logo bulunamadi. Beklenen dosyalar: ${sourceIconCandidates.join(", ")}`,
  );
}

async function main() {
  const sourceIconPath = await resolveSourceIconPath();

  for (const density of densities) {
    const targetDir = path.resolve(androidResDir, density.dir);
    await fs.mkdir(targetDir, { recursive: true });

    const iconPath = path.resolve(targetDir, `${launcherBaseName}.png`);
    const roundPath = path.resolve(targetDir, `${launcherRoundName}.png`);
    const foregroundPath = path.resolve(targetDir, `${launcherForegroundName}.png`);

    await writeIcon(iconPath, density.size);
    await writeIcon(roundPath, density.size);
    await writeIcon(foregroundPath, density.size);
  }

  await writeIconXmlTemplates();
  await patchAndroidManifest();
  await patchStringsFile();

  console.log(`[android:icon] Android app icon guncellendi (kaynak: ${sourceIconPath})`);
}

main().catch((error) => {
  console.error(`[android:icon] failed: ${error.message}`);
  process.exit(1);
});
