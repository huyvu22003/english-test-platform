import { describe, expect, it } from "vitest";
import { fmtTime, isAnswered, formatError, skillLabel, skillLabelEn, countWords } from "./utils";

describe("fmtTime", () => {
  it("formats 0 seconds", () => {
    expect(fmtTime(0)).toBe("0:00");
  });
  it("formats seconds < 60", () => {
    expect(fmtTime(45)).toBe("0:45");
  });
  it("formats exact minutes", () => {
    expect(fmtTime(120)).toBe("2:00");
  });
  it("pads seconds with leading zero", () => {
    expect(fmtTime(65)).toBe("1:05");
  });
  it("formats large values", () => {
    expect(fmtTime(3661)).toBe("61:01");
  });
});

describe("isAnswered", () => {
  it("returns false for undefined", () => {
    expect(isAnswered(undefined)).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isAnswered("")).toBe(false);
  });
  it("returns false for whitespace-only string", () => {
    expect(isAnswered("   ")).toBe(false);
  });
  it("returns true for non-empty string", () => {
    expect(isAnswered("a")).toBe(true);
  });
  it("returns false for empty array", () => {
    expect(isAnswered([])).toBe(false);
  });
  it("returns true for non-empty array", () => {
    expect(isAnswered(["a"])).toBe(true);
  });
});

describe("formatError", () => {
  it("extracts message from Error", () => {
    expect(formatError(new Error("oops"))).toBe("oops");
  });
  it("converts non-Error to string", () => {
    expect(formatError(42)).toBe("42");
  });
  it("handles null", () => {
    expect(formatError(null)).toBe("null");
  });
});

describe("skillLabel", () => {
  it("returns Vietnamese label for known skill", () => {
    expect(skillLabel("writing")).toBe("Viết");
    expect(skillLabel("reading")).toBe("Đọc");
    expect(skillLabel("listening")).toBe("Nghe");
    expect(skillLabel("use_of_english")).toBe("Use of English");
  });
  it("returns the input for unknown skill", () => {
    expect(skillLabel("unknown")).toBe("unknown");
  });
});

describe("skillLabelEn", () => {
  it("returns English label for known skill", () => {
    expect(skillLabelEn("writing")).toBe("Writing");
    expect(skillLabelEn("reading")).toBe("Reading");
    expect(skillLabelEn("listening")).toBe("Listening");
    expect(skillLabelEn("use_of_english")).toBe("Use of English");
  });
  it("returns empty string for undefined", () => {
    expect(skillLabelEn(undefined)).toBe("");
  });
  it("returns the input for unknown skill", () => {
    expect(skillLabelEn("other")).toBe("other");
  });
});

describe("countWords", () => {
  it("counts words in normal text", () => {
    expect(countWords("Hello world")).toBe(2);
  });
  it("handles multiple spaces", () => {
    expect(countWords("  multiple   spaces  here  ")).toBe(3);
  });
  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });
  it("returns 0 for whitespace-only", () => {
    expect(countWords("   ")).toBe(0);
  });
  it("counts single word", () => {
    expect(countWords("hello")).toBe(1);
  });
});
