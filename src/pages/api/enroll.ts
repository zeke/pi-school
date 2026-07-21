// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createStudent } from "../../lib/progress";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, HEAD, OPTIONS",
};

export const POST: APIRoute = async () => {
  const kv = env.PROGRESS;
  if (!kv) {
    return new Response(
      JSON.stringify({ error: "PROGRESS KV binding not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
  const { studentId, progress } = await createStudent(kv);

  return new Response(JSON.stringify({ studentId, progress }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
};

export const HEAD: APIRoute = async () => {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
