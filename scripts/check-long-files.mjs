import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const MAX_LINES = 400;
const SOURCE_DIRS = ["collector", "docs", "scripts", "tests"];
const TARGET_EXTENSIONS = new Set([".css", ".html", ".js", ".mjs"]);
const IGNORED_DIRS = new Set([
  ".git",
  "dist",
  "node_modules",
  "vendor",
  "__pycache__",
]);

const files = [];

function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectFiles(path.join(directory, entry.name));
      }
      continue;
    }

    if (entry.isFile() && TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }
}

for (const directory of SOURCE_DIRS) {
  collectFiles(path.join(projectRoot, directory));
}

const longFiles = files
  .map((file) => ({
    file: path.relative(projectRoot, file),
    lines: fs.readFileSync(file, "utf8").split("\n").length,
  }))
  .filter(({ lines }) => lines > MAX_LINES);

if (longFiles.length === 0) {
  console.info("No overly long files found.");
} else {
  console.info(`Files over ${MAX_LINES} lines:`);
  for (const { file, lines } of longFiles) {
    console.info(`- ${file}: ${lines} lines`);
  }
  process.exitCode = 1;
}
