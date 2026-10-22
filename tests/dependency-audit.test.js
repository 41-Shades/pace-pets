import { expect, it } from "vitest";

import { assessDependencyAudit } from "../scripts/dependency-audit.mjs";

const advisory = {
  name: "braces",
  dependency: "braces",
  url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
};

function auditFixture() {
  const causes = {
    braces: [advisory],
    micromatch: ["braces"],
    "fast-glob": ["micromatch"],
    globby: ["fast-glob"],
    stylelint: ["fast-glob", "globby", "micromatch"],
    "stylelint-config-recommended": ["stylelint"],
    "stylelint-config-standard": ["stylelint", "stylelint-config-recommended"],
  };
  const vulnerabilities = {};
  const packages = {};
  for (const [name, via] of Object.entries(causes)) {
    const node = `node_modules/${name}`;
    vulnerabilities[name] = {
      name,
      severity: "high",
      via: [...via],
      nodes: [node],
    };
    packages[node] = { version: "3.0.3", dev: true };
  }
  return {
    report: {
      auditReportVersion: 2,
      vulnerabilities,
      metadata: { vulnerabilities: { total: 7 } },
    },
    lockfile: { lockfileVersion: 3, packages },
  };
}

function assess(fixture, status = 1) {
  return assessDependencyAudit(
    { status, stdout: JSON.stringify(fixture.report) },
    fixture.lockfile,
  );
}

it("accepts only the development advisory and its inherited Stylelint findings", () => {
  const result = assess(auditFixture());
  expect(result.accepted).toHaveLength(7);
  expect(result.blocking).toEqual([]);
});

it("blocks another advisory on braces and all inherited findings", () => {
  const fixture = auditFixture();
  fixture.report.vulnerabilities.braces.via.push({
    ...advisory,
    url: "https://example.com/another-advisory",
  });
  expect(assess(fixture).blocking).toHaveLength(7);
});

it("blocks an additional advisory on Stylelint without suppressing it through braces", () => {
  const fixture = auditFixture();
  fixture.report.vulnerabilities.stylelint.via.push({
    name: "stylelint",
    url: "https://example.com/another-advisory",
  });
  expect(assess(fixture).blocking.map((entry) => entry.name)).toEqual([
    "stylelint",
    "stylelint-config-recommended",
    "stylelint-config-standard",
  ]);
});

it.each(["high", "critical"])(
  "blocks unrelated %s vulnerabilities",
  (severity) => {
    const fixture = auditFixture();
    fixture.report.vulnerabilities.other = {
      name: "other",
      severity,
      via: ["braces"],
      nodes: ["node_modules/other"],
    };
    fixture.lockfile.packages["node_modules/other"] = { dev: true };
    fixture.report.metadata.vulnerabilities.total++;
    expect(assess(fixture).blocking.map((entry) => entry.name)).toEqual([
      "other",
    ]);
  },
);

it("does not accept braces if any installed copy is also used in production", () => {
  const fixture = auditFixture();
  fixture.report.vulnerabilities.braces.nodes.push(
    "node_modules/other/node_modules/braces",
  );
  fixture.lockfile.packages["node_modules/other/node_modules/braces"] = {
    version: "3.0.3",
  };
  expect(assess(fixture).blocking).toHaveLength(7);
});

it.each([
  "unknown node",
  "different version",
  "dependency cycle",
  "missing cause",
])("fails closed for %s in the accepted chain", (scenario) => {
  const fixture = auditFixture();
  if (scenario === "unknown node")
    delete fixture.lockfile.packages["node_modules/braces"];
  if (scenario === "different version")
    fixture.lockfile.packages["node_modules/braces"].version = "3.0.4";
  if (scenario === "dependency cycle")
    fixture.report.vulnerabilities.braces.via = ["stylelint"];
  if (scenario === "missing cause")
    fixture.report.vulnerabilities.braces.via = ["missing"];
  expect(assess(fixture).blocking).toHaveLength(7);
});

it("preserves the existing high threshold and reports lower severity findings", () => {
  const fixture = auditFixture();
  fixture.report.vulnerabilities.stylelint.severity = "moderate";
  fixture.report.vulnerabilities.stylelint.via = [
    { name: "stylelint", url: "https://example.com/another-advisory" },
  ];
  expect(assess(fixture).belowThreshold).toEqual(["stylelint"]);
});

it("passes a successful clean audit", () => {
  const fixture = auditFixture();
  fixture.report.vulnerabilities = {};
  fixture.report.metadata.vulnerabilities.total = 0;
  expect(assess(fixture, 0)).toEqual({
    accepted: [],
    blocking: [],
    belowThreshold: [],
  });
  expect(() => assess(fixture, 1)).toThrow(
    "failed without a high or critical finding",
  );
});

it.each([true, 1, "", null, []])(
  "rejects malformed vulnerability maps: %j",
  (value) => {
    const fixture = auditFixture();
    fixture.report.vulnerabilities = value;
    fixture.report.metadata.vulnerabilities.total = 0;
    expect(() => assess(fixture, 0)).toThrow();
  },
);

it("does not accept a production dependency elsewhere in the Stylelint chain", () => {
  const fixture = auditFixture();
  delete fixture.lockfile.packages["node_modules/stylelint"].dev;
  expect(assess(fixture).blocking.map((entry) => entry.name)).toEqual([
    "stylelint",
    "stylelint-config-recommended",
    "stylelint-config-standard",
  ]);
});

it.each([
  { status: 2, stdout: "{}" },
  { status: null, signal: "SIGTERM", stdout: "{}" },
  { status: 1, error: new Error("spawn failed"), stdout: "{}" },
  { status: 1, stdout: "not JSON" },
  { status: 1, stdout: JSON.stringify({ error: { code: "ENOTFOUND" } }) },
])("rejects audit command and report failures: %j", (result) => {
  expect(() =>
    assessDependencyAudit(result, auditFixture().lockfile),
  ).toThrow();
});

it.each([
  "unknown format",
  "wrong count",
  "unknown severity",
  "missing causes",
])("rejects an invalid report with %s", (scenario) => {
  const fixture = auditFixture();
  if (scenario === "unknown format") fixture.report.auditReportVersion = 3;
  if (scenario === "wrong count")
    fixture.report.metadata.vulnerabilities.total = 0;
  if (scenario === "unknown severity")
    fixture.report.vulnerabilities.braces.severity = "unknown";
  if (scenario === "missing causes")
    fixture.report.vulnerabilities.braces.via = [];
  expect(() => assess(fixture)).toThrow();
});
