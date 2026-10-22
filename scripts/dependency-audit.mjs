import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const bracesAdvisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const stylelintChain = new Set([
  "braces",
  "micromatch",
  "fast-glob",
  "globby",
  "stylelint",
  "stylelint-config-recommended",
  "stylelint-config-standard",
]);
const severities = new Set(["info", "low", "moderate", "high", "critical"]);

function readAuditReport(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw new Error("npm audit could not complete successfully.");
  }
  const report = JSON.parse(result.stdout);
  validateAuditReport(report);
  const entries = Object.values(report.vulnerabilities);
  if (result.status === 1 && !entries.some(blocksAudit)) {
    throw new Error("npm audit failed without a high or critical finding.");
  }
  return report;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateAuditReport(report) {
  if (
    !isRecord(report) ||
    report.error ||
    report.auditReportVersion !== 2 ||
    !isRecord(report.vulnerabilities)
  ) {
    throw new Error("npm audit returned an unsupported or failed report.");
  }
  const entries = Object.entries(report.vulnerabilities);
  if (report.metadata?.vulnerabilities?.total !== entries.length) {
    throw new Error("npm audit returned inconsistent vulnerability counts.");
  }
  for (const [name, entry] of entries) {
    validateAuditEntry(name, entry);
  }
}

function validateAuditEntry(name, entry) {
  if (
    entry?.name !== name ||
    !severities.has(entry.severity) ||
    !Array.isArray(entry.via) ||
    entry.via.length === 0 ||
    !Array.isArray(entry.nodes) ||
    entry.nodes.length === 0
  ) {
    throw new Error(`npm audit returned an invalid entry: ${name}`);
  }
}

function blocksAudit(entry) {
  return entry.severity === "high" || entry.severity === "critical";
}

function isDevelopmentOnly(entry, packages) {
  return entry.nodes.every((node) => {
    const locked = packages[node];
    if (typeof node !== "string" || locked?.dev !== true) {
      return false;
    }
    return entry.name !== "braces" || locked.version === "3.0.3";
  });
}

function isAcceptedBracesFinding(name, report, packages, visiting = new Set()) {
  const entry = report.vulnerabilities[name];
  if (
    !stylelintChain.has(name) ||
    !entry ||
    visiting.has(name) ||
    !isDevelopmentOnly(entry, packages)
  ) {
    return false;
  }
  const next = new Set(visiting).add(name);
  return entry.via.every((cause) => {
    if (typeof cause === "string") {
      return isAcceptedBracesFinding(cause, report, packages, next);
    }
    return (
      name === "braces" &&
      cause?.name === "braces" &&
      cause.dependency === "braces" &&
      cause.url === bracesAdvisory
    );
  });
}

export function assessDependencyAudit(result, lockfile) {
  const report = readAuditReport(result);
  if (lockfile.lockfileVersion !== 3 || !isRecord(lockfile.packages)) {
    throw new Error(
      "A version 3 package lock is required for audit scope checks.",
    );
  }
  const accepted = [];
  const blocking = [];
  const belowThreshold = [];
  for (const [name, entry] of Object.entries(report.vulnerabilities)) {
    if (isAcceptedBracesFinding(name, report, lockfile.packages)) {
      accepted.push(name);
    } else if (blocksAudit(entry)) {
      blocking.push(entry);
    } else {
      belowThreshold.push(name);
    }
  }
  return { accepted, blocking, belowThreshold };
}

function runDependencyAudit() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const lockfile = JSON.parse(
    fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  const result = spawnSync("npm", ["audit", "--json", "--audit-level=high"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  const { accepted, blocking, belowThreshold } = assessDependencyAudit(
    result,
    lockfile,
  );
  if (accepted.length > 0) {
    console.warn(
      `Accepted development-only ${bracesAdvisory}: ${accepted.join(", ")}. See docs/guides/testing.md.`,
    );
  }
  if (belowThreshold.length > 0) {
    console.warn(
      `Findings below the high audit threshold: ${belowThreshold.join(", ")}`,
    );
  }
  if (blocking.length > 0) {
    console.error(JSON.stringify(blocking, null, 2));
    process.exitCode = 1;
  } else {
    console.log(
      "Dependency audit passed; no unaccepted high or critical findings.",
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runDependencyAudit();
  } catch (error) {
    console.error(`Dependency audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}
