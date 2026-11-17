#!/usr/bin/env node
/**
 * Refresh schemas/*.json from the Apify API (latest version source files).
 * Requires APIFY_TOKEN. Does not print the token. Does not publish anything.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.APIFY_TOKEN?.trim();
if (!token) {
  console.error("APIFY_TOKEN is required");
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "actors.json"), "utf8"));

async function getJson(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${url.replace(token, "[redacted]")}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

for (const actor of catalog.actors) {
  const versions = await getJson(`https://api.apify.com/v2/acts/${actor.actorNumericId}/versions`);
  const items = versions?.data?.items ?? [];
  const latest = items.at(-1);
  const files = latest?.sourceFiles ?? [];
  const schemaFile = files.find((f) => String(f.name ?? "").endsWith("input_schema.json"));
  if (!schemaFile?.content) {
    console.error(`No input_schema.json for ${actor.actorName}`);
    process.exitCode = 1;
    continue;
  }
  const schema = typeof schemaFile.content === "string" ? JSON.parse(schemaFile.content) : schemaFile.content;
  const dest = path.join(root, actor.schemaFile);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(schema, null, 2)}\n`);
  console.error(`updated ${actor.schemaFile} (v${latest.versionNumber})`);
}
