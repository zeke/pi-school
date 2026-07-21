#!/usr/bin/env node

// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

/* global fetch, process */

// Manages per-PR preview deployments for pi-school. Each PR gets its own
// Worker and its own KV namespace, seeded with a snapshot of the production
// PROGRESS namespace so previews have realistic data without writes ever
// touching production.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const appName = "pi-school";
const workersSubdomain = "ziki";
const productionKvNamespaceId = "1b59814976b94c2087d2cf0c272de99c";

const action = process.argv[2];
const prNumber = requiredEnv("PREVIEW_PR_NUMBER");
const previewSha = requiredEnv("PREVIEW_SHA");
const repo = requiredEnv("GITHUB_REPOSITORY");
const githubToken = requiredEnv("GITHUB_TOKEN");
const githubRunId = requiredEnv("GITHUB_RUN_ID");
const githubServerUrl = process.env.GITHUB_SERVER_URL || "https://github.com";

requiredEnv("CLOUDFLARE_ACCOUNT_ID");
requiredEnv("CLOUDFLARE_API_TOKEN");

const workerName = `${appName}-pr-${prNumber}`;
const previewKvTitle = `${appName}-progress-pr-${prNumber}`;
const environment = `preview/pr-${prNumber}`;
const environmentUrl = `https://${workerName}.${workersSubdomain}.workers.dev`;
const logUrl = `${githubServerUrl}/${repo}/actions/runs/${githubRunId}`;

if (action === "deploy") {
  await deploy();
} else if (action === "destroy") {
  await destroy();
} else {
  throw new Error("Usage: node script/preview-env.mjs <deploy|destroy>");
}

async function deploy() {
  const deployment = await createDeployment();
  await createDeploymentStatus(
    deployment.id,
    "in_progress",
    "Creating preview.",
  );

  try {
    const kvNamespaceId = await findOrCreateKvNamespace(previewKvTitle);
    await seedKvNamespace(kvNamespaceId);

    const configPath = writeTempWranglerConfig(kvNamespaceId);
    await wrangler(["deploy", "--config", configPath]);

    if (!(await isCurrentPullRequestHead())) {
      await createDeploymentStatus(
        deployment.id,
        "inactive",
        "Superseded by a newer commit.",
      );
      return;
    }

    await createDeploymentStatus(
      deployment.id,
      "success",
      "Preview deployed.",
      {
        environmentUrl,
      },
    );
    await markDeploymentsInactive(deployment.id);
  } catch (error) {
    await createDeploymentStatus(
      deployment.id,
      "failure",
      "Preview deployment failed.",
    );
    throw error;
  }
}

async function destroy() {
  const results = await Promise.allSettled([
    wrangler(["delete", "--name", workerName], {
      allowFailure: true,
      input: "y\n",
    }),
    deleteKvNamespaceIfExists(previewKvTitle),
    markDeploymentsInactive(),
  ]);

  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
}

// --- KV seeding -----------------------------------------------------------

async function findOrCreateKvNamespace(title) {
  const { stdout } = await wrangler(["kv", "namespace", "list"]);
  const namespaces = JSON.parse(stdout);
  const existing = namespaces.find((ns) => ns.title === title);
  if (existing) return existing.id;

  const { stdout: createOutput } = await wrangler([
    "kv",
    "namespace",
    "create",
    title,
  ]);
  const match = createOutput.match(/"id":\s*"([a-f0-9]+)"/);
  if (!match)
    throw new Error(`Could not parse namespace id from: ${createOutput}`);
  return match[1];
}

async function seedKvNamespace(kvNamespaceId) {
  const { stdout: listOutput } = await wrangler([
    "kv",
    "key",
    "list",
    "--namespace-id",
    productionKvNamespaceId,
    "--remote",
  ]);
  const keys = JSON.parse(listOutput).map((entry) => entry.name);
  if (keys.length === 0) return;

  const keysFile = "/tmp/pi-school-preview-keys.json";
  writeFileSync(keysFile, JSON.stringify(keys));

  const { stdout: bulkGetOutput } = await wrangler([
    "kv",
    "bulk",
    "get",
    keysFile,
    "--namespace-id",
    productionKvNamespaceId,
    "--remote",
  ]);
  const values = JSON.parse(bulkGetOutput);

  const entries = keys.map((key) => ({ key, value: values[key]?.value ?? "" }));
  const putFile = "/tmp/pi-school-preview-seed.json";
  writeFileSync(putFile, JSON.stringify(entries));

  await wrangler([
    "kv",
    "bulk",
    "put",
    putFile,
    "--namespace-id",
    kvNamespaceId,
    "--remote",
  ]);
}

async function deleteKvNamespaceIfExists(title) {
  const { stdout } = await wrangler(["kv", "namespace", "list"], {
    allowFailure: true,
  });
  let namespaces = [];
  try {
    namespaces = JSON.parse(stdout);
  } catch {
    return;
  }
  const existing = namespaces.find((ns) => ns.title === title);
  if (!existing) return;

  await wrangler(
    ["kv", "namespace", "delete", "--namespace-id", existing.id, "-y"],
    {
      allowFailure: true,
    },
  );
}

// --- Temp Wrangler config ---------------------------------------------------

function writeTempWranglerConfig(kvNamespaceId) {
  const config = {
    name: workerName,
    compatibility_date: "2026-07-15",
    compatibility_flags: ["nodejs_compat"],
    assets: { directory: "./dist" },
    vars: { SITE_URL: environmentUrl },
    kv_namespaces: [{ binding: "PROGRESS", id: kvNamespaceId }],
  };
  const configPath = "/tmp/pi-school-preview-wrangler.json";
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

// --- GitHub Deployments API -------------------------------------------------

async function createDeployment() {
  return githubApi(`/repos/${repo}/deployments`, {
    method: "POST",
    body: {
      ref: previewSha,
      auto_merge: false,
      required_contexts: [],
      environment,
      description: `Preview deployment for PR #${prNumber}`,
      transient_environment: true,
      production_environment: false,
    },
  });
}

async function createDeploymentStatus(
  deploymentId,
  state,
  description,
  options = {},
) {
  return githubApi(`/repos/${repo}/deployments/${deploymentId}/statuses`, {
    method: "POST",
    body: {
      state,
      environment,
      description,
      log_url: logUrl,
      environment_url: options.environmentUrl || "",
      auto_inactive: false,
    },
  });
}

async function markDeploymentsInactive(excludeDeploymentId) {
  const deployments = await githubApi(
    `/repos/${repo}/deployments?environment=${encodeURIComponent(environment)}&per_page=100`,
  );

  await Promise.allSettled(
    deployments
      .filter((deployment) => deployment.id !== excludeDeploymentId)
      .map((deployment) =>
        createDeploymentStatus(deployment.id, "inactive", "Preview destroyed."),
      ),
  );
}

async function isCurrentPullRequestHead() {
  const pull = await githubApi(`/repos/${repo}/pulls/${prNumber}`);
  return pull.head?.sha === previewSha;
}

async function githubApi(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${body}`);
  }

  if (response.status === 204) return undefined;
  return response.json();
}

// --- Process helpers ---------------------------------------------------

async function wrangler(args, options = {}) {
  return run("npx", ["wrangler", ...args], options);
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: [options.input ? "pipe" : "ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || options.allowFailure) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });

    if (options.input) child.stdin.end(options.input);
  });
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
