import { describe, expect, it } from "vitest";
import {
  FORMATTING_INSTRUCTIONS,
  withFormattingInstructions,
} from "./formatting-instructions";

describe("withFormattingInstructions", () => {
  it("appends the formatting note after the lesson's own instructions", () => {
    const result = withFormattingInstructions(
      "Cover these topics:\n1. Thing one.",
    );
    expect(result.startsWith("Cover these topics:\n1. Thing one.")).toBe(true);
    expect(result).toContain(FORMATTING_INSTRUCTIONS);
  });

  it("trims surrounding whitespace from the lesson instructions", () => {
    const result = withFormattingInstructions("  \n  Cover this.  \n  ");
    expect(result.startsWith("Cover this.")).toBe(true);
  });
});
