// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { withQuizInstructions } from "../../../lib/quiz-instructions";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const GET: APIRoute = async () => {
  const lessons = (await getCollection("lessons")).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const body = lessons.map((lesson) => ({
    title: lesson.data.title,
    slug: lesson.data.slug,
    description: lesson.data.description,
    order: lesson.data.order,
    quiz: lesson.data.quiz,
    agentInstructions: lesson.data.quiz
      ? withQuizInstructions(lesson.data.agentInstructions)
      : lesson.data.agentInstructions,
  }));

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
