// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

// Shared formatting note appended to every lesson/exercise's
// agentInstructions at serve time. Pi's TUI always prints literal ``` fence
// lines around triple-backtick code blocks (never suppressed or turned into
// a border), and blocks with no specific language (e.g. ```text) get no
// syntax highlighting — so a single command or URL wrapped in a fenced
// block looks like unrendered markdown. Inline single backticks don't have
// this problem: Pi's renderer consumes them and never prints the backtick
// characters. Lesson MDX files should not duplicate this text in their
// `agentInstructions` frontmatter — the API appends it.

export const FORMATTING_INSTRUCTIONS = `
When telling the student to run a single command, slash command, or URL
(e.g. \`/reload\`, \`pi install npm:pi-web-access\`, a URL to fetch), use
inline code with single backticks, not a fenced triple-backtick code
block. Reserve triple-backtick fences for genuinely multi-line content
like scripts or config files.
`.trim();

export function withFormattingInstructions(agentInstructions: string): string {
  return `${agentInstructions.trim()}\n\n${FORMATTING_INSTRUCTIONS}`;
}
