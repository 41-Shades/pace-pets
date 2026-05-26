import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const chartPackageRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.resolve("chart.js/auto"))),
);
const sourceFiles = ["chart.umd.min.js", "chart.umd.min.js.map"];
const destinationDir = path.join(projectRoot, "collector/extension/vendor");

fs.mkdirSync(destinationDir, { recursive: true });

for (const fileName of sourceFiles) {
  fs.copyFileSync(
    path.join(chartPackageRoot, "dist", fileName),
    path.join(destinationDir, fileName),
  );
}

console.log(`Vendored Chart.js ${sourceFiles.join(", ")}.`);
