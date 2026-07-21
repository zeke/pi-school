import { describe, expect, it } from "vitest";
import { generateStudentId, isValidStudentId } from "./student-id";

describe("generateStudentId", () => {
  it("produces an adjective-noun-nnnn id", () => {
    const id = generateStudentId();
    expect(isValidStudentId(id)).toBe(true);
  });

  it("produces different ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateStudentId()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe("isValidStudentId", () => {
  it("accepts well-formed ids", () => {
    expect(isValidStudentId("curious-hacker-2019")).toBe(true);
  });

  it("rejects malformed ids", () => {
    expect(isValidStudentId("not-an-id")).toBe(false);
    expect(isValidStudentId("Curious-Hacker-2019")).toBe(false);
    expect(isValidStudentId("curious-hacker-19")).toBe(false);
    expect(isValidStudentId("")).toBe(false);
  });
});
