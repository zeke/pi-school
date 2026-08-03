import { describe, expect, it } from "vitest";
import {
  QUIZ_INSTRUCTIONS,
  shouldIncludeQuiz,
  withQuizInstructions,
} from "./quiz-instructions";

describe("withQuizInstructions", () => {
  it("appends the quiz boilerplate after the lesson's own instructions", () => {
    const result = withQuizInstructions("Cover these topics:\n1. Thing one.");
    expect(result.startsWith("Cover these topics:\n1. Thing one.")).toBe(true);
    expect(result).toContain(QUIZ_INSTRUCTIONS);
  });

  it("trims surrounding whitespace from the lesson instructions", () => {
    const result = withQuizInstructions("  \n  Cover this.  \n  ");
    expect(result.startsWith("Cover this.")).toBe(true);
  });
});

describe("shouldIncludeQuiz", () => {
  it("is false for non-quiz lessons regardless of pace", () => {
    expect(shouldIncludeQuiz(false, "thorough")).toBe(false);
    expect(shouldIncludeQuiz(false, "fast")).toBe(false);
    expect(shouldIncludeQuiz(false, undefined)).toBe(false);
  });

  it("is false for quiz lessons when pace is fast", () => {
    expect(shouldIncludeQuiz(true, "fast")).toBe(false);
  });

  it("is false for quiz lessons when pace is unset (defaults to fast)", () => {
    expect(shouldIncludeQuiz(true, undefined)).toBe(false);
  });

  it("is true for quiz lessons when pace is thorough", () => {
    expect(shouldIncludeQuiz(true, "thorough")).toBe(true);
  });
});
