import { beforeEach, describe, expect, it } from "vitest";
import {
  createStudent,
  getProfile,
  getProgress,
  markExerciseComplete,
  markExerciseIncomplete,
  markLessonComplete,
  markLessonIncomplete,
  resetProgress,
  updateProfile,
} from "./progress";

// Minimal in-memory stand-in for the subset of KVNamespace this module uses.
function createFakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string, type?: string) => {
      const raw = store.get(key) ?? null;
      if (raw === null) return null;
      return type === "json" ? JSON.parse(raw) : raw;
    },
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

  it("creates empty progress for a given student id", async () => {
    const progress = await createStudent(kv, "curious-hacker-2019");
    expect(progress.completedLessons).toEqual([]);
    expect(progress.completedExercises).toEqual([]);
    expect(progress.createdAt).toBe(progress.updatedAt);
  });

  it("stores an optional device id", async () => {
    await createStudent(kv, "curious-hacker-2019", "device-abc");
    const progress = await getProgress(kv, "curious-hacker-2019");
    expect(progress?.deviceId).toBe("device-abc");
  });

  it("persists progress so it can be read back", async () => {
    await createStudent(kv, "curious-hacker-2019");
    const progress = await getProgress(kv, "curious-hacker-2019");
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
  it("adds a lesson entry with source and timestamp", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");

    const progress = await markLessonComplete(
      kv,
      "curious-hacker-2019",
      "installation",
      "agent",
      "anthropic/claude-sonnet-4-5",
    );
    expect(progress?.completedLessons).toHaveLength(1);
    expect(progress?.completedLessons[0]).toMatchObject({
      slug: "installation",
      source: "agent",
      model: "anthropic/claude-sonnet-4-5",
    });
  });

  it("defaults to browser source", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");
    const progress = await markLessonComplete(
      kv,
      "curious-hacker-2019",
      "installation",
    );
    expect(progress?.completedLessons[0].source).toBe("browser");
  });

  it("is idempotent", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");

    await markLessonComplete(kv, "curious-hacker-2019", "installation");
    const progress = await markLessonComplete(
      kv,
      "curious-hacker-2019",
      "installation",
    );
    expect(progress?.completedLessons).toHaveLength(1);
  });

  it("returns null for an unknown student", async () => {
    const kv = createFakeKv();
    expect(
      await markLessonComplete(kv, "nobody-here-0000", "installation"),
    ).toBeNull();
  });
});

describe("markLessonIncomplete", () => {
  it("removes a completed lesson", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");
    await markLessonComplete(kv, "curious-hacker-2019", "installation");

    const progress = await markLessonIncomplete(
      kv,
      "curious-hacker-2019",
      "installation",
    );
    expect(progress?.completedLessons).toEqual([]);
  });
});

describe("markExerciseComplete / markExerciseIncomplete", () => {
  it("adds and removes an exercise entry", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");

    const added = await markExerciseComplete(
      kv,
      "curious-hacker-2019",
      "build-a-website",
    );
    expect(added?.completedExercises).toHaveLength(1);

    const removed = await markExerciseIncomplete(
      kv,
      "curious-hacker-2019",
      "build-a-website",
    );
    expect(removed?.completedExercises).toEqual([]);
  });
});

describe("resetProgress", () => {
  it("clears lessons and exercises but keeps profile and createdAt", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");
    await markLessonComplete(kv, "curious-hacker-2019", "installation");
    await markExerciseComplete(kv, "curious-hacker-2019", "build-a-website");
    await updateProfile(kv, "curious-hacker-2019", { os: "macos" });

    const before = await getProgress(kv, "curious-hacker-2019");
    const progress = await resetProgress(kv, "curious-hacker-2019");

    expect(progress?.completedLessons).toEqual([]);
    expect(progress?.completedExercises).toEqual([]);
    expect(progress?.profile?.os).toBe("macos");
    expect(progress?.createdAt).toBe(before?.createdAt);
  });
});

describe("getProfile / updateProfile", () => {
  it("returns an empty object when no profile has been set", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");
    expect(await getProfile(kv, "curious-hacker-2019")).toEqual({});
  });

  it("merges partial profile updates", async () => {
    const kv = createFakeKv();
    await createStudent(kv, "curious-hacker-2019");

    await updateProfile(kv, "curious-hacker-2019", { os: "macos" });
    const profile = await updateProfile(kv, "curious-hacker-2019", {
      terminalComfort: "very",
    });

    expect(profile).toEqual({ os: "macos", terminalComfort: "very" });
  });

  it("returns null for an unknown student", async () => {
    const kv = createFakeKv();
    expect(await getProfile(kv, "nobody-here-0000")).toBeNull();
  });
});
