#!/usr/bin/env node
/**
 * Local MCP test: list tools, then run two cheap public actors.
 * Never prints APIFY_TOKEN or other secrets.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { applyLimitDefaults } from "./server.js";
import { enabledActors, loadCatalog } from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverJs = path.join(here, "index.js");

interface CallCheck {
  name: string;
  ok: boolean;
  itemCount?: number;
  estimateUsd?: number;
  preview?: string;
  error?: string;
}

function textOf(result: { content?: Array<{ type: string; text?: string }>; isError?: boolean }): string {
  const parts = (result.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text as string);
  return parts.join("\n");
}

function previewItems(text: string, max = 400): string {
  return text.replace(/apify_api_[A-Za-z0-9]+/g, "[redacted]").slice(0, max);
}

function countJsonArray(text: string): number | undefined {
  const start = text.indexOf("[");
  if (start < 0) return undefined;
  try {
    const parsed = JSON.parse(text.slice(start));
    return Array.isArray(parsed) ? parsed.length : undefined;
  } catch {
    const match = text.match(/^(\d+) result/);
    return match ? Number(match[1]) : undefined;
  }
}

async function main(): Promise<void> {
  if (!process.env.APIFY_TOKEN) {
    process.stderr.write("APIFY_TOKEN is required for the live tool calls in this test.\n");
    process.exitCode = 1;
    return;
  }

  const catalog = loadCatalog();
  const enabled = enabledActors(catalog).map((a) => a.toolName).sort();
  process.stderr.write(`Starting MCP stdio server (${serverJs})\n`);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverJs],
    env: {
      ...process.env,
      // token already in env; do not log env
    } as Record<string, string>,
    stderr: "pipe",
  });
  if (transport.stderr) {
    transport.stderr.on("data", (buf: Buffer) => {
      const line = buf.toString("utf8").replace(/apify_api_[A-Za-z0-9]+/g, "[redacted]");
      process.stderr.write(line);
    });
  }

  const client = new Client({ name: "vanborn-labs-mcp-test", version: "0.1.0" });
  await client.connect(transport);

  const listed = await client.listTools();
  const names = listed.tools.map((t) => t.name).sort();
  process.stderr.write(`tools/list (${names.length}): ${names.join(", ")}\n`);

  const expected = new Set([...enabled, "vanborn_labs_catalog"]);
  const missing = [...expected].filter((n) => !names.includes(n));
  const unexpectedEnabled = names.filter((n) => n !== "vanborn_labs_catalog" && !expected.has(n));
  if (missing.length || unexpectedEnabled.length) {
    throw new Error(
      `Tool list mismatch. missing=${missing.join(",") || "-"} unexpected=${unexpectedEnabled.join(",") || "-"}`,
    );
  }

  const catalogResult = await client.callTool({ name: "vanborn_labs_catalog", arguments: {} });
  const catalogText = textOf(catalogResult as never);
  if (catalogResult.isError || !catalogText.includes("email_domain_validator")) {
    throw new Error("vanborn_labs_catalog did not return the expected catalog");
  }

  const checks: CallCheck[] = [];

  const emailActor = catalog.actors.find((a) => a.toolName === "email_domain_validator");
  const emailArgs = applyLimitDefaults(
    {
      emails: ["not-an-email", "user@mailinator.com", "jane@gmial.com"],
      suggestTypos: true,
      maxItems: 3,
    },
    emailActor!,
  );
  process.stderr.write("Calling email_domain_validator (3 emails)…\n");
  const emailRes = await client.callTool({ name: "email_domain_validator", arguments: emailArgs });
  const emailText = textOf(emailRes as never);
  const emailCount = countJsonArray(emailText) ?? 0;
  const emailOk = !emailRes.isError && emailCount >= 1;
  checks.push({
    name: "email_domain_validator",
    ok: emailOk,
    itemCount: emailCount,
    estimateUsd: (emailActor?.startPriceUsd ?? 0.00005) + emailCount * (emailActor?.pricePerResultUsd ?? 0.0005),
    preview: previewItems(emailText),
    error: emailRes.isError ? emailText.slice(0, 500) : undefined,
  });
  process.stderr.write(`email_domain_validator: ${emailOk ? "ok" : "FAIL"} items=${emailCount}\n`);

  const newsActor = catalog.actors.find((a) => a.toolName === "google_news_rss");
  const newsArgs = applyLimitDefaults(
    {
      queries: ["model context protocol"],
      language: "en",
      country: "US",
      maxItems: 3,
    },
    newsActor!,
  );
  process.stderr.write("Calling google_news_rss (1 query, maxItems 3)…\n");
  const newsRes = await client.callTool({ name: "google_news_rss", arguments: newsArgs });
  const newsText = textOf(newsRes as never);
  const newsCount = countJsonArray(newsText) ?? 0;
  const newsOk = !newsRes.isError && newsCount >= 1;
  checks.push({
    name: "google_news_rss",
    ok: newsOk,
    itemCount: newsCount,
    estimateUsd: (newsActor?.startPriceUsd ?? 0.00005) + newsCount * (newsActor?.pricePerResultUsd ?? 0.001),
    preview: previewItems(newsText),
    error: newsRes.isError ? newsText.slice(0, 500) : undefined,
  });
  process.stderr.write(`google_news_rss: ${newsOk ? "ok" : "FAIL"} items=${newsCount}\n`);

  const estimateUsd = checks.reduce((sum, c) => sum + (c.estimateUsd ?? 0), 0);
  const summary = {
    toolsListed: names,
    enabledActors: enabled,
    checks,
    estimateUsd: Number(estimateUsd.toFixed(6)),
    underBudget: estimateUsd < 0.05,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  await client.close();

  if (checks.some((c) => !c.ok) || !summary.underBudget) {
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
