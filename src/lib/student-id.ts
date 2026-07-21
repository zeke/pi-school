// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

// Student IDs look like "curious-hacker-2019": an adjective, a noun, and a
// 4-digit number. ~9.7 million possible combinations, unguessable enough for
// low-stakes progress data with no authentication.

const ADJECTIVES = [
  "agile",
  "amber",
  "ancient",
  "bold",
  "brave",
  "bright",
  "calm",
  "clever",
  "cosmic",
  "curious",
  "daring",
  "eager",
  "fleet",
  "fuzzy",
  "gentle",
  "golden",
  "happy",
  "humble",
  "jolly",
  "keen",
  "lively",
  "lucky",
  "merry",
  "mighty",
  "nimble",
  "plucky",
  "quiet",
  "quirky",
  "radiant",
  "rapid",
  "sharp",
  "spry",
  "steady",
  "swift",
  "vivid",
  "witty",
];

const NOUNS = [
  "agent",
  "anchor",
  "beacon",
  "builder",
  "comet",
  "compass",
  "coyote",
  "drifter",
  "falcon",
  "forge",
  "fox",
  "glacier",
  "hacker",
  "harbor",
  "heron",
  "kestrel",
  "lantern",
  "lynx",
  "maker",
  "mariner",
  "otter",
  "pioneer",
  "raven",
  "river",
  "rover",
  "sailor",
  "scout",
  "sparrow",
  "tinker",
  "voyager",
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function randomNumber(): number {
  return Math.floor(Math.random() * 9000) + 1000;
}

export function generateStudentId(): string {
  return `${randomFrom(ADJECTIVES)}-${randomFrom(NOUNS)}-${randomNumber()}`;
}

const STUDENT_ID_PATTERN = /^[a-z]+-[a-z]+-\d{4}$/;

export function isValidStudentId(id: string): boolean {
  return STUDENT_ID_PATTERN.test(id);
}
