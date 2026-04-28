import { decodePresetValues, encodePresetValues } from "@/lib/share/url";
import { describe, expect, it } from "vitest";

describe("share/url", () => {
  it("round-trips simple values", () => {
    const values = { PHASE_N: 9, LANE_NAME: "法人面", ENABLE: true };
    const token = encodePresetValues(values);
    expect(decodePresetValues(token)).toEqual(values);
  });

  it("token uses URL-safe charset (no +/=)", () => {
    const token = encodePresetValues({ NOTE: "hello world / + foo === bar" });
    expect(token).not.toMatch(/[+/=]/);
  });

  it("returns null on garbage", () => {
    expect(decodePresetValues("@@@not-base64@@@")).toBeNull();
  });

  it("returns null on non-object payload", () => {
    const arr = encodePresetValues([1, 2, 3] as unknown as Parameters<
      typeof encodePresetValues
    >[0]);
    expect(decodePresetValues(arr)).toBeNull();
  });

  it("preserves Chinese characters", () => {
    const values = { LANE_NAME: "籌碼-分點", MEMO: "中文字測試" };
    const token = encodePresetValues(values);
    expect(decodePresetValues(token)).toEqual(values);
  });
});
