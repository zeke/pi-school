// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

// Streams video files from the R2 bucket that backs the homepage intro
// video and any other large static assets. Videos are too big for Workers
// static assets (25 MiB per-file limit), so they live in R2 instead.
import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.path;
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const range = request.headers.get("Range");
  const object = await env.VIDEOS.get(key, {
    range: range ? parseRange(range) : undefined,
  });

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Accept-Ranges", "bytes");

  // R2 always populates object.range (defaulting to the full object), so we
  // decide 200 vs. 206 based on whether the client actually sent a Range
  // header, not on the presence of object.range itself.
  const isPartial = range !== null;
  if (isPartial) {
    const { offset, length } = object.range as {
      offset: number;
      length: number;
    };
    headers.set(
      "Content-Range",
      `bytes ${offset}-${offset + length - 1}/${object.size}`,
    );
    headers.set("Content-Length", String(length));
  } else {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(object.body, {
    status: isPartial ? 206 : 200,
    headers,
  });
};

function parseRange(header: string): R2Range | undefined {
  const match = /bytes=(\d+)-(\d+)?/.exec(header);
  if (!match) return undefined;
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  return end !== undefined ? { offset, length: end - offset + 1 } : { offset };
}
