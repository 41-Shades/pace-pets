import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultThemeRoot = path.join(
  repoRoot,
  "collector",
  "extension",
  "themes",
  "default",
);
const defaultTargetDirs = [defaultThemeRoot];
await import(
  pathToFileURL(
    path.join(
      repoRoot,
      "collector/extension/themes/default/asset-manifest.js",
    ),
  )
);
const themeAssets = globalThis.CodexThemeAssets;
if (!themeAssets) {
  throw new Error(
    "Theme asset manifest must be importable by maintenance scripts.",
  );
}
const iconFiles = themeAssets.PACE_ICON_FILES;

function targetDirsFromArgs() {
  const targetArgIndex = process.argv.indexOf("--target");
  if (targetArgIndex === -1) {
    return defaultTargetDirs;
  }

  const targetPath = process.argv[targetArgIndex + 1];
  if (!targetPath) {
    throw new Error("Missing path after --target.");
  }

  return [path.resolve(repoRoot, targetPath)];
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function isBackgroundCandidate(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 232 && max - min <= 22;
}

function transparentizeBorderBackground(source) {
  const output = new PNG({ width: source.width, height: source.height });
  source.data.copy(output.data);

  const { width, height } = source;
  const visited = new Uint8Array(width * height);
  const queue = [];
  let transparentPixels = 0;

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const pointIndex = y * width + x;
    if (visited[pointIndex]) {
      return;
    }

    const dataIndex = pointIndex * 4;
    const r = source.data[dataIndex];
    const g = source.data[dataIndex + 1];
    const b = source.data[dataIndex + 2];
    if (!isBackgroundCandidate(r, g, b)) {
      return;
    }

    visited[pointIndex] = 1;
    queue.push(pointIndex);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pointIndex = queue[cursor];
    const x = pointIndex % width;
    const y = Math.floor(pointIndex / width);
    const dataIndex = pointIndex * 4;

    output.data[dataIndex + 3] = 0;
    transparentPixels += 1;

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return { png: output, transparentPixels };
}

const targetDirs = targetDirsFromArgs();

for (const iconFile of iconFiles) {
  const sourcePath = path.join(defaultThemeRoot, iconFile);
  const source = readPng(sourcePath);
  const { png, transparentPixels } = transparentizeBorderBackground(source);

  for (const targetDir of targetDirs) {
    writePng(path.join(targetDir, iconFile), png);
  }

  const totalPixels = source.width * source.height;
  const percent = ((transparentPixels / totalPixels) * 100).toFixed(1);
  console.log(
    `${iconFile}: ${transparentPixels}/${totalPixels} (${percent}%) transparent`,
  );
}
