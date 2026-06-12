import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const textFileExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".yml",
  ".yaml",
]);
const requiredTrackedTextPaths = [
  "LICENSE",
  ".gitattributes",
  ".prettierignore",
];
const publicSurfacePatterns = [
  /^README\.md$/,
  /^LICENSE$/,
  /^PRIVACY\.md$/,
  /^SECURITY\.md$/,
  /^package(?:-lock)?\.json$/,
  /^collector\/extension\//,
  /^data\/usage\.sample\.json$/,
  /^docs\/(?:guides|operations|reference)\//,
  /^docs\/(?:index|extension)\.html$/,
  /^docs\/styles\.css$/,
  /^index\.html$/,
  /^scripts\/.*\.mjs$/,
  /^(?:eslint|stylelint)\.config\.mjs$/,
  /^\.github\/.*\.ya?ml$/,
];
const publicSurfaceExclusions = [
  /^docs\/guides\/maintainer-launch-checklist\.md$/,
  /^collector\/extension\/vendor\//,
  /^collector\/extension\/.*\.png$/,
];
const disallowedTrackedPathPatterns = [
  /^\.codex(?:\/|$)/i,
  /^\.maintainer(?:\/|$)/i,
  /^data\/chrome-web-store-assets(?:\/|$)/i,
  /^data\/usage\.json$/i,
  /^docs\/plans(?:\/|$)/i,
  /^docs\/guides\/clean-public-export\.md$/i,
  /^docs\/guides\/ignored-maintainer-artifacts\.md$/i,
  /^docs\/guides\/maintainer-launch-checklist\.md$/i,
  /^security_best_practices_report\.md$/i,
  /(^|\/)cookies?([._-]|$)/i,
  /(^|\/)tokens?([._-]|$)/i,
  /(^|\/)sessions?([._-]|$)/i,
  /(^|\/)raw([._-]|$)/i,
  /(^|\/)screenshots?([._-]|$)/i,
  /\.(db|dump|har|log|sqlite)$/i,
];
const disallowedTrackedContentPatterns = [
  {
    pattern:
      /(?:\/(?:Users|home)\/[^/\s]+|[A-Za-z]:[\\/]+Users[\\/][^\\/\s]+)/i,
    message: "tracked text must not contain local user-profile paths",
  },
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    message: "tracked text must not contain private key material",
  },
];
const internalPlansPathPattern = ["docs", "plans"].join("\\/");
const disallowedPublicContentPatterns = [
  {
    pattern: new RegExp(
      `\\]\\([^)]*${internalPlansPathPattern}\\/|href=["'][^"']*${internalPlansPathPattern}\\/`,
      "i",
    ),
    message: "public release surface must not link to internal planning docs",
  },
  {
    pattern: /\bCurrent Dev Plan\b/i,
    message:
      "public release surface must not present internal plans as current docs",
  },
  {
    pattern: /\bAuthorization:\s*Bearer\s+\S+/i,
    message: "public release surface must not contain bearer tokens",
  },
];
const requiredExportIgnorePaths = [
  ".codex",
  ".codex/**",
  ".maintainer",
  ".maintainer/**",
  ["docs", "plans"].join("/"),
  `${["docs", "plans"].join("/")}/**`,
  "data/chrome-web-store-assets",
  "data/chrome-web-store-assets/**",
  "docs/guides/clean-public-export.md",
  "docs/guides/ignored-maintainer-artifacts.md",
  "docs/guides/maintainer-launch-checklist.md",
  "security_best_practices_report.md",
];
const requiredGitignorePaths = [
  "data/usage.json",
  "data/chrome-web-store-assets/",
  ".codex/",
  ".maintainer/",
  `${["docs", "plans"].join("/")}/`,
  "docs/guides/clean-public-export.md",
  "docs/guides/ignored-maintainer-artifacts.md",
  "docs/guides/maintainer-launch-checklist.md",
  "security_best_practices_report.md",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
  );
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z", "--cached"], {
    cwd: projectRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter((relativePath) =>
      fs.existsSync(path.join(projectRoot, relativePath)),
    );
}

function readFileBuffer(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath));
}

function isTextFile(relativePath) {
  if (textFileExtensions.has(path.extname(relativePath))) {
    return true;
  }

  return !readFileBuffer(relativePath).includes(0);
}

function isPublicSurface(relativePath) {
  return (
    publicSurfacePatterns.some((pattern) => pattern.test(relativePath)) &&
    !publicSurfaceExclusions.some((pattern) => pattern.test(relativePath))
  );
}

function assertNoDisallowedContent(relativePath, patterns) {
  const text = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  for (const { pattern, message } of patterns) {
    assert(!pattern.test(text), `${message}: ${relativePath}`);
  }
}

function assertVersionConsistency() {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const manifest = readJson("collector/extension/manifest.json");
  assert(
    packageJson.version === manifest.version,
    `package.json version ${packageJson.version} must match manifest version ${manifest.version}.`,
  );
  assert(
    packageLock.version === packageJson.version,
    "package-lock.json root version must match package.json.",
  );
  assert(
    packageLock.packages?.[""]?.version === packageJson.version,
    "package-lock.json package entry version must match package.json.",
  );
}

function exportIgnoreEntries() {
  const attributesPath = path.join(projectRoot, ".gitattributes");
  assert(fs.existsSync(attributesPath), "Missing .gitattributes.");

  return fs
    .readFileSync(attributesPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function gitignoreEntries() {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  assert(fs.existsSync(gitignorePath), "Missing .gitignore.");

  return fs
    .readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function assertPublicArtifactExportIgnores() {
  const entries = exportIgnoreEntries();
  for (const ignoredPath of requiredExportIgnorePaths) {
    assert(
      entries.includes(`${ignoredPath} export-ignore`),
      `Public artifact must export-ignore internal path: ${ignoredPath}`,
    );
  }
}

function assertPublicArtifactGitignores() {
  const entries = gitignoreEntries();
  for (const ignoredPath of requiredGitignorePaths) {
    assert(
      entries.includes(ignoredPath),
      `Local maintainer artifact must be gitignored: ${ignoredPath}`,
    );
  }
}

const tracked = trackedFiles();
for (const relativePath of tracked) {
  assert(
    !disallowedTrackedPathPatterns.some((pattern) =>
      pattern.test(relativePath),
    ),
    `Tracked file is not allowed in release-safe source: ${relativePath}`,
  );
}

const trackedTextFiles = tracked.filter(isTextFile);
for (const requiredTextPath of requiredTrackedTextPaths) {
  assert(
    !tracked.includes(requiredTextPath) ||
      trackedTextFiles.includes(requiredTextPath),
    `Tracked text scanning must include extensionless/dotfile text: ${requiredTextPath}`,
  );
}

for (const relativePath of trackedTextFiles) {
  assertNoDisallowedContent(relativePath, disallowedTrackedContentPatterns);
}

for (const relativePath of trackedTextFiles.filter(isPublicSurface)) {
  assertNoDisallowedContent(relativePath, disallowedPublicContentPatterns);
}

assertVersionConsistency();
assertPublicArtifactExportIgnores();
assertPublicArtifactGitignores();

console.log("Release artifact checks passed.");
