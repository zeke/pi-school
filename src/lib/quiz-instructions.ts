// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

// Shared quiz boilerplate injected at serve time for lessons with
// `quiz: true`. Lesson MDX files should not duplicate this text in their
// `agentInstructions` frontmatter — they list four topics and a
// verification step, and the API appends this.

import type { StudentProfile } from "./progress";

export const QUIZ_INSTRUCTIONS = `
After teaching each topic, ask a quiz question to check understanding
before moving to the next topic. Ask one question at a time and wait for
the student's answer. If they get it wrong, explain the correct answer
before continuing rather than just moving on.

Every API call this lesson requires (reading lesson content, checking
progress, marking the lesson complete) should be made with the \`bash\`
tool using \`curl\`, since Pi has no built-in webfetch tool.
`.trim();

export function withQuizInstructions(agentInstructions: string): string {
  return `${agentInstructions.trim()}\n\n${QUIZ_INSTRUCTIONS}`;
}

/**
 * Decide whether a lesson's agentInstructions should include the quiz
 * boilerplate. Quiz lessons only get quizzed for students on "thorough"
 * pace — "fast" (the default, including no profile/no pace set) skips
 * quizzes entirely.
 */
export function shouldIncludeQuiz(
  quiz: boolean,
  pace: StudentProfile["pace"] | undefined,
): boolean {
  return quiz && pace === "thorough";
}
