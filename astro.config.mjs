// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { parse as parseJsonc } from "jsonc-parser";

// Read public, non-secret values from wrangler.jsonc so the deployment config
// is the single source of truth. These get inlined into the build, which is
// needed because human-facing pages are prerendered — runtime `env` bindings
// aren't available when the HTML is generated.
//
// WRANGLER_CONFIG_PATH lets preview deploys build against a per-PR config
// (different Worker name, different KV namespace) without touching the
// checked-in wrangler.jsonc. See script/preview-env.mjs.
const projectRoot = dirname(fileURLToPath(import.meta.url));
const wranglerConfigPath = process.env.WRANGLER_CONFIG_PATH
  ? resolve(projectRoot, process.env.WRANGLER_CONFIG_PATH)
  : resolve(projectRoot, "wrangler.jsonc");
const wranglerConfig = parseJsonc(readFileSync(wranglerConfigPath, "utf-8"));
const wranglerVars = wranglerConfig?.vars ?? {};
const siteUrl = wranglerVars.SITE_URL || "https://pi-school.ziki.boo";

export default defineConfig({
  site: siteUrl,
  output: "server",
  adapter: cloudflare({ configPath: wranglerConfigPath }),
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: "vesper",
    },
  },
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
