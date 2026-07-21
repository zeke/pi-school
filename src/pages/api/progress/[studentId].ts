// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getProgress, markLessonComplete } from "../../../lib/progress";
import { isValidStudentId } from "../../../lib/student-id";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const GET: APIRoute = async ({ params }) => {
  const studentId = params.studentId ?? "";
  if (!isValidStudentId(studentId)) {
    return jsonError("Invalid student ID", 400);
  }

  const kv = env.PROGRESS;
  if (!kv) return jsonError("PROGRESS KV binding not configured", 500);
  const progress = await getProgress(kv, studentId);
  if (!progress) return jsonError("Student not found", 404);

  return new Response(JSON.stringify(progress), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const studentId = params.studentId ?? "";
  if (!isValidStudentId(studentId)) {
    return jsonError("Invalid student ID", 400);
  }

  let body: { lessonSlug?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.lessonSlug || typeof body.lessonSlug !== "string") {
    return jsonError("lessonSlug is required", 400);
  }

  const kv = env.PROGRESS;
  if (!kv) return jsonError("PROGRESS KV binding not configured", 500);
  const progress = await markLessonComplete(kv, studentId, body.lessonSlug);
  if (!progress) return jsonError("Student not found", 404);

  return new Response(JSON.stringify(progress), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
