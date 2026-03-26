import fs from "node:fs/promises";
import path from "node:path";

const TARGETS = [
  path.resolve("dist"),
  path.resolve("android", "app", "src", "main", "assets", "public"),
];

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(targetPath, out = []) {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await listFiles(fullPath, out);
      continue;
    }
    if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

async function rewriteFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  await fs.writeFile(tempPath, buffer);
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await fs.rename(tempPath, filePath);
        return;
      } catch (error) {
        if ((error?.code !== "EPERM" && error?.code !== "EBUSY") || attempt === 3) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
      }
    }

    await fs.copyFile(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

async function main() {
  let failed = 0;
  for (const target of TARGETS) {
    if (!(await exists(target))) {
      continue;
    }

    const files = await listFiles(target);
    for (const file of files) {
      try {
        await rewriteFile(file);
      } catch (error) {
        failed += 1;
        console.warn(
          `[android:normalize-assets] skipped ${file}: ${error?.message ?? error}`,
        );
      }
    }
  }

  if (failed > 0) {
    console.warn(
      `[android:normalize-assets] completed with ${failed} skipped file(s).`,
    );
  }
}

main().catch((error) => {
  console.error("[android:normalize-assets] failed:", error.message);
  process.exit(1);
});
