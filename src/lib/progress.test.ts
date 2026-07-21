import { beforeEach, describe, expect, it } from "vitest";
import { createStudent, getProgress, markLessonComplete } from "./progress";
import { isValidStudentId } from "./student-id";

// Minimal in-memory stand-in for the subset of KVNamespace this module uses.
function createFakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

describe("createStudent", () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createFakeKv();
  });

  it("generates a valid student id with empty progress", async () => {
    const { studentId, progress } = await createStudent(kv);
    expect(isValidStudentId(studentId)).toBe(true);
    expect(progress.completedLessons).toEqual([]);
    expect(progress.createdAt).toBe(progress.updatedAt);
  });

  it("persists progress so it can be read back", async () => {
    const { studentId } = await createStudent(kv);
    const progress = await getProgress(kv, studentId);
    expect(progress).not.toBeNull();
    expect(progress?.completedLessons).toEqual([]);
  });
});

describe("getProgress", () => {
  it("returns null for an unknown student", async () => {
    const kv = createFakeKv();
    expect(await getProgress(kv, "nobody-here-0000")).toBeNull();
  });
});

describe("markLessonComplete", () => {
  it("adds a lesson slug to completedLessons", async () => {
    const kv = createFakeKv();
    const { studentId } = await createStudent(kv);

    const progress = await markLessonComplete(kv, studentId, "installation");
    expect(progress?.completedLessons).toEqual(["installation"]);
  });

  it("is idempotent", async () => {
    const kv = createFakeKv();
    const { studentId } = await createStudent(kv);

    await markLessonComplete(kv, studentId, "installation");
    const progress = await markLessonComplete(kv, studentId, "installation");
    expect(progress?.completedLessons).toEqual(["installation"]);
  });

  it("returns null for an unknown student", async () => {
    const kv = createFakeKv();
    expect(
      await markLessonComplete(kv, "nobody-here-0000", "installation"),
    ).toBeNull();
  });
});
