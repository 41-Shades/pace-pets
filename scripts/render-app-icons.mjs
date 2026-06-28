import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = path.join(
  projectRoot,
  "scripts",
  "assets",
  "app-icon-mascot-source.png",
);
const outputRoot = path.join(
  projectRoot,
  "collector",
  "extension",
  "themes",
  "default",
  "app-icons",
);

const iconSizes = Object.freeze([16, 32, 48, 128]);
const mascotCrop = Object.freeze({
  x: 14,
  y: 29,
  width: 102,
  height: 90,
});

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  fs.writeFileSync(
    filePath,
    PNG.sync.write(png, {
      colorType: 6,
      deflateLevel: 9,
      deflateStrategy: 3,
      inputColorType: 6,
    }),
  );
}

function sourcePixel(source, x, y) {
  const left = Math.max(0, Math.min(source.width - 1, Math.floor(x)));
  const top = Math.max(0, Math.min(source.height - 1, Math.floor(y)));
  const right = Math.max(0, Math.min(source.width - 1, left + 1));
  const bottom = Math.max(0, Math.min(source.height - 1, top + 1));
  const xAmount = Math.max(0, Math.min(1, x - left));
  const yAmount = Math.max(0, Math.min(1, y - top));
  const samples = [
    { x: left, y: top, weight: (1 - xAmount) * (1 - yAmount) },
    { x: right, y: top, weight: xAmount * (1 - yAmount) },
    { x: left, y: bottom, weight: (1 - xAmount) * yAmount },
    { x: right, y: bottom, weight: xAmount * yAmount },
  ];

  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const sample of samples) {
    const index = (sample.y * source.width + sample.x) * 4;
    const sampleAlpha = (source.data[index + 3] / 255) * sample.weight;
    alpha += sampleAlpha;
    red += source.data[index] * sampleAlpha;
    green += source.data[index + 1] * sampleAlpha;
    blue += source.data[index + 2] * sampleAlpha;
  }

  if (alpha <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: Math.round(red / alpha),
    g: Math.round(green / alpha),
    b: Math.round(blue / alpha),
    a: Math.round(alpha * 255),
  };
}

function blendPixel(output, x, y, color) {
  if (x < 0 || y < 0 || x >= output.width || y >= output.height) {
    return;
  }

  const targetIndex = (y * output.width + x) * 4;
  const sourceAlpha = color.a / 255;
  const targetAlpha = output.data[targetIndex + 3] / 255;
  const alpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (alpha <= 0) {
    return;
  }

  output.data[targetIndex] = Math.round(
    (color.r * sourceAlpha +
      output.data[targetIndex] * targetAlpha * (1 - sourceAlpha)) /
      alpha,
  );
  output.data[targetIndex + 1] = Math.round(
    (color.g * sourceAlpha +
      output.data[targetIndex + 1] * targetAlpha * (1 - sourceAlpha)) /
      alpha,
  );
  output.data[targetIndex + 2] = Math.round(
    (color.b * sourceAlpha +
      output.data[targetIndex + 2] * targetAlpha * (1 - sourceAlpha)) /
      alpha,
  );
  output.data[targetIndex + 3] = Math.round(alpha * 255);
}

function drawMascot(output, source) {
  const maxWidth = output.width * 0.96;
  const maxHeight = output.height * 0.96;
  const scale = Math.min(
    maxWidth / mascotCrop.width,
    maxHeight / mascotCrop.height,
  );
  const targetWidth = Math.round(mascotCrop.width * scale);
  const targetHeight = Math.round(mascotCrop.height * scale);
  const targetX = Math.round((output.width - targetWidth) / 2);
  const targetY = Math.round((output.height - targetHeight) * 0.6);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX =
        mascotCrop.x + ((x + 0.5) / targetWidth) * mascotCrop.width - 0.5;
      const sourceY =
        mascotCrop.y + ((y + 0.5) / targetHeight) * mascotCrop.height - 0.5;

      blendPixel(
        output,
        targetX + x,
        targetY + y,
        sourcePixel(source, sourceX, sourceY),
      );
    }
  }
}

const source = readPng(sourcePath);
for (const size of iconSizes) {
  const output = new PNG({ width: size, height: size });
  drawMascot(output, source);
  writePng(path.join(outputRoot, `icon${size}.png`), output);
  console.log(`Rendered icon${size}.png`);
}
