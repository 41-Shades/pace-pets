import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const extensionRoot = path.join(projectRoot, "collector", "extension");
const distDir = path.join(projectRoot, "dist");
const packageJson = readJson(path.join(projectRoot, "package.json"));
const manifest = readJson(path.join(extensionRoot, "manifest.json"));
const packageBaseName = `${packageJson.name}-chrome-extension-v${manifest.version}`;
const outputPath = path.join(distDir, `${packageBaseName}.zip`);
const metadataPath = path.join(distDir, `${packageBaseName}.release.json`);
const checksumPath = path.join(distDir, `${packageBaseName}.zip.sha256`);
const fixedZipDate = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
const sourceOnlyFiles = new Set([
  "README.md",
  "dev-flags-current-mode.css",
  "dev-flags-current-mode.js",
  "dev-flags.css",
  "dev-flags.html",
  "dev-flags.js",
]);
const allowedPackagedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".png",
]);
const textPackagedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
]);
const disallowedPackagedPathPatterns = [
  /(^|\/)usage\.json$/i,
  /(^|\/)cookies?([._-]|$)/i,
  /(^|\/)tokens?([._-]|$)/i,
  /(^|\/)sessions?([._-]|$)/i,
  /(^|\/)raw([._-]|$)/i,
  /(^|\/)screenshots?([._-]|$)/i,
  /(^|\/)(?:data|docs|scripts|tests|node_modules|dist)(\/|$)/i,
  /(^|\/)\./,
  /\.(db|dump|har|log|sqlite|tar|tgz|zip)$/i,
];
const localUserProfilePathPattern =
  /(?:\/(?:Users|home)\/[^/\s]+|[A-Za-z]:[\\/]+Users[\\/][^\\/\s]+)/i;
const disallowedPackagedContentPatterns = [
  {
    pattern: localUserProfilePathPattern,
    message: "Package text must not contain local user-profile paths",
  },
  {
    pattern: /\bAuthorization:\s*Bearer\s+\S+/i,
    message: "Package text must not contain concrete bearer headers",
  },
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    message: "Package text must not contain private key material",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePackagePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Package must not include symlinks: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      return listFiles(absolutePath);
    }
    if (!entry.isFile()) {
      throw new Error(`Package path must be a regular file: ${absolutePath}`);
    }
    return [absolutePath];
  });
}

function assertVersionConsistency() {
  assert(
    packageJson.version === manifest.version,
    `package.json version ${packageJson.version} must match manifest version ${manifest.version}.`,
  );
  assert(
    packageJson.name === "pace-pets",
    `Unexpected package name for release artifact: ${packageJson.name}`,
  );
  assert(
    manifest.name === "Pace Pets",
    `Unexpected extension name for release artifact: ${manifest.name}`,
  );
}

function assertPackageFile(relativePath, absolutePath) {
  const extension = path.extname(relativePath);
  assert(
    allowedPackagedExtensions.has(extension),
    `Unexpected packaged extension file type: ${relativePath}`,
  );
  assert(
    !disallowedPackagedPathPatterns.some((pattern) =>
      pattern.test(relativePath),
    ),
    `Packaged extension must not include private/generated artifacts: ${relativePath}`,
  );

  if (!textPackagedExtensions.has(extension)) {
    return;
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  for (const { pattern, message } of disallowedPackagedContentPatterns) {
    assert(!pattern.test(text), `${message}: ${relativePath}`);
  }
}

function packageEntries() {
  const entries = listFiles(extensionRoot)
    .map((absolutePath) => ({
      absolutePath,
      relativePath: normalizePackagePath(
        path.relative(extensionRoot, absolutePath),
      ),
    }))
    .filter(({ relativePath }) => !sourceOnlyFiles.has(relativePath))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  assert(
    entries.some(({ relativePath }) => relativePath === "manifest.json"),
    "Package must include manifest.json at the zip root.",
  );

  for (const { relativePath, absolutePath } of entries) {
    assertPackageFile(relativePath, absolutePath);
  }

  return entries;
}

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date) {
  const year = Math.max(date.getUTCFullYear(), 1980);
  const dosTime =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    Math.floor(date.getUTCSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getUTCMonth() + 1) << 5) |
    date.getUTCDate();
  return { dosDate, dosTime };
}

function writeUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(entries) {
  const { dosDate, dosTime } = dosTimestamp(fixedZipDate);
  const localFileRecords = [];
  const centralDirectoryRecords = [];
  let offset = 0;

  for (const { relativePath, absolutePath } of entries) {
    const fileName = Buffer.from(relativePath, "utf8");
    const input = fs.readFileSync(absolutePath);
    const compressed = zlib.deflateRawSync(input, { level: 9 });
    const checksum = crc32(input);
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(8),
      writeUInt16(dosTime),
      writeUInt16(dosDate),
      writeUInt32(checksum),
      writeUInt32(compressed.length),
      writeUInt32(input.length),
      writeUInt16(fileName.length),
      writeUInt16(0),
      fileName,
    ]);

    localFileRecords.push(localHeader, compressed);
    centralDirectoryRecords.push(
      Buffer.concat([
        writeUInt32(0x02014b50),
        writeUInt16(20),
        writeUInt16(20),
        writeUInt16(0),
        writeUInt16(8),
        writeUInt16(dosTime),
        writeUInt16(dosDate),
        writeUInt32(checksum),
        writeUInt32(compressed.length),
        writeUInt32(input.length),
        writeUInt16(fileName.length),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(0o100644 << 16),
        writeUInt32(offset),
        fileName,
      ]),
    );
    offset += localHeader.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralDirectoryRecords);
  const endOfCentralDirectory = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0),
  ]);

  return Buffer.concat([
    ...localFileRecords,
    centralDirectory,
    endOfCentralDirectory,
  ]);
}

function runPackageCheck(scriptPath) {
  execFileSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

function gitOutput(args) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function releaseMetadata(zipBuffer, entries) {
  const gitCommit = gitOutput(["rev-parse", "HEAD"]);
  const gitTag = gitOutput(["describe", "--tags", "--exact-match", "HEAD"]);
  const gitStatus = gitOutput(["status", "--short"]);
  const zipSha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");

  return {
    packageName: packageJson.name,
    extensionName: manifest.name,
    version: manifest.version,
    zipFile: path.basename(outputPath),
    zipSha256,
    zipEntryTimestamp: fixedZipDate.toISOString(),
    fileCount: entries.length,
    source: {
      gitCommit,
      gitTag,
      workingTreeClean: gitStatus === "",
    },
  };
}

const crc32Table = makeCrc32Table();

assertVersionConsistency();
runPackageCheck("scripts/extension-check.mjs");
runPackageCheck("scripts/vendor-asset-check.mjs");

const entries = packageEntries();
const zipBuffer = createZip(entries);
const metadata = releaseMetadata(zipBuffer, entries);
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputPath, zipBuffer);
fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
fs.writeFileSync(
  checksumPath,
  `${metadata.zipSha256}  ${path.basename(outputPath)}\n`,
);

console.log(`Created ${path.relative(projectRoot, outputPath)}`);
console.log(`Created ${path.relative(projectRoot, metadataPath)}`);
console.log(`Created ${path.relative(projectRoot, checksumPath)}`);
if (!metadata.source.workingTreeClean) {
  console.warn("Warning: working tree has uncommitted changes.");
}
if (metadata.source.gitTag !== `v${manifest.version}`) {
  console.warn(
    `Warning: HEAD is not tagged as v${manifest.version}; tag the public source before Web Store submission.`,
  );
}
console.log(`Packaged ${entries.length} extension files:`);
for (const { relativePath } of entries) {
  console.log(`- ${relativePath}`);
}
