import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PNG } from "pngjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const defaultThemeRoot = path.join(
  projectRoot,
  "collector",
  "extension",
  "themes",
  "default",
);

await import(
  pathToFileURL(
    path.join(
      projectRoot,
      "collector/extension/themes/default/asset-manifest.js",
    ),
  )
);
const themeAssets = globalThis.CodexThemeAssets;
if (!themeAssets) {
  throw new Error("Theme asset manifest must be importable.");
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    buffer,
    png: PNG.sync.read(buffer),
  };
}

function sameDecodedPixels(first, second) {
  return (
    first.width === second.width &&
    first.height === second.height &&
    Buffer.compare(first.data, second.data) === 0
  );
}

function optimizedEncoding(png, originalSize) {
  let best = null;
  for (let strategy = 0; strategy <= 4; strategy += 1) {
    const buffer = PNG.sync.write(png, {
      colorType: 6,
      deflateLevel: 9,
      deflateStrategy: strategy,
      inputColorType: 6,
    });
    const decoded = PNG.sync.read(buffer);
    if (!sameDecodedPixels(png, decoded)) {
      throw new Error("Optimized PNG changed decoded pixels.");
    }
    if (!best || buffer.length < best.buffer.length) {
      best = {
        buffer,
        savings: originalSize - buffer.length,
        strategy,
      };
    }
  }
  return best;
}

for (const fileName of themeAssets.PACE_ICON_FILES) {
  const iconPath = path.join(defaultThemeRoot, fileName);
  const source = readPng(iconPath);
  const optimized = optimizedEncoding(source.png, source.buffer.length);
  fs.writeFileSync(iconPath, optimized.buffer);

  console.log(
    `${fileName}: ${source.buffer.length} -> ${optimized.buffer.length} bytes; ` +
      `saved ${optimized.savings} with strategy ${optimized.strategy}`,
  );
}
