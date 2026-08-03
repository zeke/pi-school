// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import { describe, expect, it } from "vitest";
import { GET } from "./openapi.json";

// biome-ignore lint/suspicious/noExplicitAny: astro's APIContext is heavier than this test needs
function makeContext(url: string): any {
  return { request: new Request(url) };
}

// biome-ignore lint/suspicious/noExplicitAny: the spec is untyped JSON, asserted structurally by the tests below
async function fetchSpec(): Promise<{ response: Response; body: any }> {
  const response = (await GET(
    makeContext("https://pi-school.ziki.boo/api/openapi.json"),
  )) as Response;
  const body = await response.json();
  return { response, body };
}

describe("GET /api/openapi.json", () => {
  it("returns JSON with a 200 status", async () => {
    const { response } = await fetchSpec();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets servers[0].url to the request origin", async () => {
    const { body } = await fetchSpec();
    expect(body.servers).toEqual([{ url: "https://pi-school.ziki.boo" }]);
  });

  it("is a structurally valid OpenAPI 3.1 document with resolvable $refs", async () => {
    const { body } = await fetchSpec();
    // Throws if the document doesn't conform to the OpenAPI schema, or if
    // any $ref points at a component that doesn't exist.
    await expect(
      SwaggerParser.validate(structuredClone(body)),
    ).resolves.toBeTruthy();
  });

  it("documents every route file under src/pages/api", async () => {
    const { body } = await fetchSpec();
    const apiDir = join(import.meta.dirname);
    const routeFiles: string[] = [];

    function walk(dir: string, prefix: string) {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
          walk(fullPath, `${prefix}/${entry}`);
          continue;
        }
        if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
        if (entry === "openapi.json.ts") continue; // the spec doesn't document itself

        const name = entry.replace(/\.ts$/, "");
        const segment =
          name === "index"
            ? ""
            : name.startsWith("[") && name.endsWith("]")
              ? `/{${name.slice(1, -1)}}`
              : `/${name}`;
        routeFiles.push(`${prefix}${segment}`);
      }
    }

    walk(apiDir, "/api");

    expect(Object.keys(body.paths).sort()).toEqual(routeFiles.sort());
  });

  it("documents the same HTTP methods each route file actually exports", async () => {
    const { body } = await fetchSpec();
    const fileForPath: Record<string, string> = {
      "/api/enroll": "enroll.ts",
      "/api/lessons": "lessons/index.ts",
      "/api/lessons/{slug}": "lessons/[slug].ts",
      "/api/exercises": "exercises/index.ts",
      "/api/exercises/{slug}": "exercises/[slug].ts",
      "/api/progress/{studentId}": "progress/[studentId].ts",
      "/api/profile/{studentId}": "profile/[studentId].ts",
    };

    for (const [path, file] of Object.entries(fileForPath)) {
      const source = readFileSync(join(import.meta.dirname, file), "utf-8");
      const exportedMethods = new Set(
        [...source.matchAll(/export const (GET|POST|PUT|DELETE):/g)].map((m) =>
          m[1]?.toLowerCase(),
        ),
      );

      const documentedMethods = new Set(Object.keys(body.paths[path]));
      expect(documentedMethods, `methods documented for ${path}`).toEqual(
        exportedMethods,
      );
    }
  });

  it("declares every schema referenced by name in components.schemas", async () => {
    const { body } = await fetchSpec();
    const definedSchemas = new Set(Object.keys(body.components.schemas));
    const referenced = new Set<string>();

    JSON.stringify(body, (_key, value) => {
      if (
        typeof value === "string" &&
        value.startsWith("#/components/schemas/")
      ) {
        referenced.add(value.replace("#/components/schemas/", ""));
      }
      return value;
    });

    for (const name of referenced) {
      expect(
        definedSchemas.has(name),
        `${name} is referenced but not defined`,
      ).toBe(true);
    }
  });

  it("keeps the StudentProfile schema's enum options in sync with the profile route's validation", async () => {
    const { body } = await fetchSpec();
    const profileSource = readFileSync(
      join(import.meta.dirname, "profile/[studentId].ts"),
      "utf-8",
    );

    const profileSchema = body.components.schemas.StudentProfile.properties;

    const fields: Array<{
      constName: string;
      schemaProp: string;
      isArray?: boolean;
    }> = [
      { constName: "VALID_PACE", schemaProp: "pace" },
      { constName: "VALID_CODING_EXPERIENCE", schemaProp: "codingExperience" },
      { constName: "VALID_AI_TOOLS", schemaProp: "aiTools", isArray: true },
      { constName: "VALID_EDITORS", schemaProp: "editor" },
      { constName: "VALID_TERMINAL_COMFORT", schemaProp: "terminalComfort" },
      { constName: "VALID_LEARNING_STYLE", schemaProp: "learningStyle" },
      { constName: "VALID_DEPTH_PREFERENCE", schemaProp: "depthPreference" },
      { constName: "VALID_LANGUAGES", schemaProp: "languages", isArray: true },
    ];

    for (const { constName, schemaProp, isArray } of fields) {
      const match = profileSource.match(
        new RegExp(`const ${constName} = (\\[[^\\]]*\\]);`),
      );
      expect(match, `${constName} not found in profile route`).not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: asserted above
      const expected = JSON.parse(match![1]!.replace(/,(\s*\])/g, "$1"));

      const actual = isArray
        ? profileSchema[schemaProp].items.enum
        : profileSchema[schemaProp].enum;

      expect(actual, schemaProp).toEqual(expected);
    }
  });
});
