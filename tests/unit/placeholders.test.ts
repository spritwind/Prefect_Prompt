import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/placeholders/render";
import { validateValues } from "@/lib/placeholders/validate";
import type { PlaceholderSchema } from "@/lib/placeholders/types";

const schema: Record<string, PlaceholderSchema> = {
  PHASE_N: { type: "number", label: "Phase", default: 9 },
  LANE_NAME: { type: "select", label: "Lane", options: ["法人面", "籌碼-分點"] },
  ENABLE: { type: "boolean", label: "Enable", default: false },
  NOTE: { type: "multiline", label: "Note" },
  TITLE: { type: "text", label: "Title" },
};

describe("renderTemplate", () => {
  it("substitutes single placeholder", () => {
    expect(renderTemplate("Phase {PHASE_N} go", { PHASE_N: 9 })).toBe("Phase 9 go");
  });

  it("substitutes multiple placeholders", () => {
    expect(
      renderTemplate("{TITLE}: {LANE_NAME}", { TITLE: "Lane", LANE_NAME: "法人面" }),
    ).toBe("Lane: 法人面");
  });

  it("leaves undefined placeholders untouched", () => {
    expect(renderTemplate("Phase {PHASE_N} {MISSING}", { PHASE_N: 9 })).toBe(
      "Phase 9 {MISSING}",
    );
  });

  it("renders boolean as yes/no", () => {
    expect(renderTemplate("Enable: {ENABLE}", { ENABLE: true })).toBe("Enable: yes");
    expect(renderTemplate("Enable: {ENABLE}", { ENABLE: false })).toBe("Enable: no");
  });

  it("does not substitute inside escaped braces", () => {
    expect(renderTemplate("\\{PHASE_N\\}", { PHASE_N: 9 })).toBe("{PHASE_N}");
  });
});

describe("validateValues", () => {
  it("accepts valid values", () => {
    const result = validateValues(schema, { PHASE_N: 9, LANE_NAME: "法人面" });
    expect(result.ok).toBe(true);
  });

  it("rejects select value not in options", () => {
    const result = validateValues(schema, { LANE_NAME: "INVALID" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.LANE_NAME).toMatch(/options/);
  });

  it("rejects number-typed field with non-number value", () => {
    const result = validateValues(schema, { PHASE_N: "nine" as unknown as number });
    expect(result.ok).toBe(false);
  });

  it("allows missing optional values", () => {
    const result = validateValues(schema, {});
    expect(result.ok).toBe(true);
  });
});
