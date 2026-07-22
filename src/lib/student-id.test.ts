import { describe, expect, it } from "vitest";
import { generateStudentId, isValidStudentId } from "./student-id";

describe("generateStudentId", () => {
  it("produces an adjective-noun-nnnn id", async () => {
    const id = await generateStudentId();
    expect(isValidStudentId(id)).toBe(true);
  });

  it("produces different ids across calls", async () => {
    const ids = new Set(
      await Promise.all(Array.from({ length: 20 }, () => generateStudentId())),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it("retries on collision when a kv namespace is provided", async () => {
    const seen = new Set<string>();
    const kv = {
      get: async (key: string) => (seen.has(key) ? "taken" : null),
    } as unknown as KVNamespace;

    const id = await generateStudentId(kv);
    expect(isValidStudentId(id)).toBe(true);
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
