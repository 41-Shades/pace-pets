import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const originalDocument = globalThis.document;

class FakeElement {
  constructor(tagName) {
    this.attributes = new Map();
    this.children = [];
    this.tagName = tagName;
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

const shell = new FakeElement("div");
const querySelector = vi.fn((selector) =>
  selector === ".shell" ? shell : null,
);

function findByClass(root, className) {
  if (!(root instanceof FakeElement)) {
    return null;
  }
  if (root.attributes.get("class") === className) {
    return root;
  }
  return root.children
    .map((child) => findByClass(child, className))
    .find(Boolean);
}

beforeAll(async () => {
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: () => null,
    querySelector,
  };
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-info-template.js"),
    )
  );
});

afterAll(() => {
  globalThis.document = originalDocument;
});

describe("dashboard info template", () => {
  it("mounts the modal overlay at the page shell", () => {
    expect(querySelector).toHaveBeenCalledWith(".shell");
    expect(shell.children).toHaveLength(1);
    expect(shell.children[0].attributes.get("id")).toBe("info-overlay");
  });

  it("places Clear data at the right side of the footer row", () => {
    const footer = findByClass(shell, "info-panel-meta-row");

    expect(footer.children).toHaveLength(2);
    expect(footer.children[0].attributes.get("class")).toBe("info-panel-meta");
    expect(footer.children[1].attributes.get("id")).toBe("clear-data-button");
  });
});
