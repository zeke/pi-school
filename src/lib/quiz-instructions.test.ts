import { describe, expect, it } from "vitest";
import { QUIZ_INSTRUCTIONS, withQuizInstructions } from "./quiz-instructions";

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
