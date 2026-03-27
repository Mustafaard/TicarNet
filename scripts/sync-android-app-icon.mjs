import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceIconPath = path.resolve(projectRoot, "public", "splash", "logo.png");
const androidResDir = path.resolve(projectRoot, "android", "app", "src", "main", "res");

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
  await sharp(sourceIconPath)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
}

async function main() {
  if (!(await ensureExists(sourceIconPath))) {
    throw new Error(`logo bulunamadi: ${sourceIconPath}`);
  }

  for (const density of densities) {
    const targetDir = path.resolve(androidResDir, density.dir);
    await fs.mkdir(targetDir, { recursive: true });

    const iconPath = path.resolve(targetDir, "ic_launcher.png");
    const roundPath = path.resolve(targetDir, "ic_launcher_round.png");
    const foregroundPath = path.resolve(targetDir, "ic_launcher_foreground.png");

    await writeIcon(iconPath, density.size);
    await writeIcon(roundPath, density.size);
    await writeIcon(foregroundPath, density.size);
  }

  console.log("[android:icon] Android app icon guncellendi (kaynak: public/splash/logo.png)");
}

main().catch((error) => {
  console.error(`[android:icon] failed: ${error.message}`);
  process.exit(1);
});
