// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { getCollection } from "astro:content";
import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getProfile } from "../../../lib/progress";
import {
  shouldIncludeQuiz,
  withQuizInstructions,
} from "../../../lib/quiz-instructions";
import { isValidStudentId } from "../../../lib/student-id";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const GET: APIRoute = async ({ params, request }) => {
  const lessons = await getCollection("lessons");
  const lesson = lessons.find((l) => l.data.slug === params.slug);

  if (!lesson) {
    return new Response(JSON.stringify({ error: "Lesson not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const studentId = new URL(request.url).searchParams.get("studentId");
  const profile =
    studentId && isValidStudentId(studentId)
      ? await getProfile(env.PROGRESS, studentId)
      : null;

  const body = {
    title: lesson.data.title,
    slug: lesson.data.slug,
    description: lesson.data.description,
    order: lesson.data.order,
    quiz: lesson.data.quiz,
    agentInstructions: shouldIncludeQuiz(lesson.data.quiz, profile?.pace)
      ? withQuizInstructions(lesson.data.agentInstructions)
      : lesson.data.agentInstructions,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
