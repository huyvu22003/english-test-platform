import { describe, expect, it, beforeEach } from "vitest";
import {
  isValidBandScore,
  workflowMessage,
  average,
  escExcel,
  num,
  wc,
  readGradingDraft,
  writeGradingDraft,
  clearGradingDraft,
} from "./gradingUtils";

describe("isValidBandScore", () => {
  it("accepts valid band scores (0-9, step 0.5)", () => {
    expect(isValidBandScore(0)).toBe(true);
    expect(isValidBandScore(4.5)).toBe(true);
    expect(isValidBandScore(9)).toBe(true);
    expect(isValidBandScore(6.5)).toBe(true);
  });
  it("rejects scores outside 0-9", () => {
    expect(isValidBandScore(-1)).toBe(false);
    expect(isValidBandScore(9.5)).toBe(false);
    expect(isValidBandScore(10)).toBe(false);
  });
  it("rejects non-0.5 steps", () => {
    expect(isValidBandScore(4.3)).toBe(false);
    expect(isValidBandScore(7.1)).toBe(false);
  });
  it("rejects NaN and Infinity", () => {
    expect(isValidBandScore(NaN)).toBe(false);
    expect(isValidBandScore(Infinity)).toBe(false);
  });
});

describe("workflowMessage", () => {
  it("returns correct messages for each status", () => {
    expect(workflowMessage("assigned")).toContain("đang chấm");
    expect(workflowMessage("in_review")).toContain("review");
    expect(workflowMessage("graded")).toContain("hoàn tất");
    expect(workflowMessage("submitted")).toContain("chờ xử lý");
  });
});

describe("average", () => {
  it("returns null for empty array", () => {
    expect(average([])).toBeNull();
  });
  it("returns null for all-null values", () => {
    expect(average([null, undefined, null])).toBeNull();
  });
  it("computes average of valid numbers", () => {
    expect(average([4, 6, 8])).toBe(6);
  });
  it("ignores null/undefined values", () => {
    expect(average([4, null, 6, undefined])).toBe(5);
  });
});

describe("escExcel", () => {
  it("escapes HTML entities", () => {
    expect(escExcel('<b>"test"</b> & more')).toBe("&lt;b&gt;&quot;test&quot;&lt;/b&gt; &amp; more");
  });
  it("escapes single quotes", () => {
    expect(escExcel("it's")).toBe("it&#39;s");
  });
  it("handles null/undefined", () => {
    expect(escExcel(null)).toBe("");
    expect(escExcel(undefined)).toBe("");
  });
});

describe("num", () => {
  it("returns empty string for null/undefined", () => {
    expect(num(null)).toBe("");
    expect(num(undefined)).toBe("");
  });
  it("converts number to string", () => {
    expect(num(7.5)).toBe("7.5");
    expect(num(0)).toBe("0");
  });
});

describe("wc", () => {
  it("returns 0 for null", () => {
    expect(wc(null)).toBe(0);
  });
  it("counts words correctly", () => {
    expect(wc("Hello world")).toBe(2);
    expect(wc("  multiple   spaces  here  ")).toBe(3);
  });
  it("returns 0 for empty/whitespace", () => {
    expect(wc("")).toBe(0);
    expect(wc("   ")).toBe(0);
  });
});

describe("grading draft storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads null when no draft exists", () => {
    expect(readGradingDraft("test-id")).toBeNull();
  });

  it("writes and reads a valid draft", () => {
    const draft = {
      scores: { tr: 6, cc: 5.5, lr: 6.5, gra: 7 },
      feedback: "Good work",
      corrections: [],
      updatedAt: "2024-01-01T00:00:00Z",
    };
    writeGradingDraft("test-id", draft);
    expect(readGradingDraft("test-id")).toEqual(draft);
  });

  it("clears draft", () => {
    const draft = {
      scores: { tr: 6, cc: 5.5, lr: 6.5, gra: 7 },
      feedback: "",
      corrections: [],
      updatedAt: "",
    };
    writeGradingDraft("test-id", draft);
    clearGradingDraft("test-id");
    expect(readGradingDraft("test-id")).toBeNull();
  });

  it("returns null for corrupted data", () => {
    localStorage.setItem("etp:admin:grading-draft:bad", "not json");
    expect(readGradingDraft("bad")).toBeNull();
  });

  it("returns null for incomplete draft", () => {
    localStorage.setItem("etp:admin:grading-draft:bad2", JSON.stringify({ scores: {} }));
    expect(readGradingDraft("bad2")).toBeNull();
  });
});
