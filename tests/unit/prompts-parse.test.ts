import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePrompt } from "@/lib/prompts/parse";
import { describe, expect, it } from "vitest";

const fixture = readFileSync(path.join(__dirname, "../fixtures/prompts/sample.md"), "utf8");

describe("parsePrompt", () => {
  it("extracts metadata from frontmatter", () => {
    const doc = parsePrompt(fixture, "factor-research/test/sample.md");
    expect(doc.id).toBe("sample");
    expect(doc.title).toBe("Sample Prompt");
    expect(doc.category).toBe("general/test");
    expect(doc.tags).toEqual(["test", "fixture"]);
  });

  it("extracts placeholder schema", () => {
    const doc = parsePrompt(fixture, "x.md");
    expect(doc.placeholders.NAME.type).toBe("text");
    expect(doc.placeholders.NAME.label).toBe("Name");
  });

  it("returns body without frontmatter", () => {
    const doc = parsePrompt(fixture, "x.md");
    expect(doc.body.trim()).toBe("Hello {NAME}!");
  });

  it("throws on missing required field id", () => {
    const bad = "---\ntitle: x\n---\nbody";
    expect(() => parsePrompt(bad, "x.md")).toThrow(/id/);
  });

  it("throws on missing title", () => {
    const bad = "---\nid: x\n---\nbody";
    expect(() => parsePrompt(bad, "x.md")).toThrow(/title/);
  });

  it("parses examples from frontmatter", () => {
    const md = `---
id: ex-test
title: Example Test
category: general/test
examples:
  - name: "Sample 1"
    values:
      X: 1
      Y: hello
---
body`;
    const doc = parsePrompt(md, "x.md");
    expect(doc.examples).toHaveLength(1);
    expect(doc.examples?.[0]).toEqual({ name: "Sample 1", values: { X: 1, Y: "hello" } });
  });

  it("examples are optional", () => {
    const md = `---
id: ex-none
title: No Examples
category: general/test
---
body`;
    const doc = parsePrompt(md, "x.md");
    expect(doc.examples).toBeUndefined();
  });
});
