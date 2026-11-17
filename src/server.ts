import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ActorConfig, Catalog } from "./config.js";
import { enabledActors, loadCatalog, loadInputSchema } from "./config.js";
import { ApifyRequestError, getApifyToken, runSyncGetDatasetItems } from "./apify.js";
import { actorInputZod } from "./schema.js";

export const SERVER_NAME = "vanborn-labs";
export const SERVER_VERSION = "0.2.0";

const MAX_RESPONSE_CHARS = 120_000;

export function applyLimitDefaults(
  input: Record<string, unknown>,
  actor: ActorConfig,
): Record<string, unknown> {
  const next = { ...input };
  if (actor.limitField && (next[actor.limitField] === undefined || next[actor.limitField] === null)) {
    next[actor.limitField] = actor.defaultMaxItems;
  }
  return next;
}

function formatResult(actor: ActorConfig, input: Record<string, unknown>, result: { items: unknown[]; itemCount: number; total?: number }): string {
  const header = [
    `${result.itemCount} result${result.itemCount === 1 ? "" : "s"} from ${actor.actorId}.`,
    `Store: ${actor.storeUrl}`,
    `Charged to your Apify account (${actor.priceLabel ?? "pay-per-event"}).`,
    actor.limitField ? `Input ${actor.limitField}=${String(input[actor.limitField])}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  let body = JSON.stringify(result.items, null, 2);
  if (body.length > MAX_RESPONSE_CHARS) {
    body = `${body.slice(0, MAX_RESPONSE_CHARS)}\n… truncated (${result.itemCount} items; response capped at ${MAX_RESPONSE_CHARS} characters).`;
  }
  return `${header}\n\n${body}`;
}

function registerActorTool(server: McpServer, actor: ActorConfig): void {
  const rawSchema = loadInputSchema(actor);
  const inputSchema = actorInputZod(rawSchema, actor.limitField, actor.defaultMaxItems);

  server.registerTool(
    actor.toolName,
    {
      title: actor.title,
      description: actor.description,
      inputSchema,
      annotations: {
        title: actor.title,
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      const token = getApifyToken();
      if (!token) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "APIFY_TOKEN is not set. Create a personal API token at https://console.apify.com/settings/integrations and add it to this MCP server's env. Runs are billed to your Apify account; Van Born Labs tools are pay-per-event. Store: https://apify.com/vanborn_labs",
            },
          ],
        };
      }

      const input = applyLimitDefaults((args ?? {}) as Record<string, unknown>, actor);
      try {
        const result = await runSyncGetDatasetItems({
          actorId: actor.actorId,
          token,
          input,
          timeoutSecs: actor.timeoutSecs,
        });
        return {
          content: [{ type: "text" as const, text: formatResult(actor, input, result) }],
        };
      } catch (err) {
        const message =
          err instanceof ApifyRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Failed to run ${actor.toolName}: ${message}` }],
        };
      }
    },
  );
}

export function createServer(catalog: Catalog = loadCatalog()): McpServer {
  const tools = enabledActors(catalog);
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: [
        "Van Born Labs data tools for YouTube, Google News, email validation, ATS job boards, and more.",
        "Each tool runs a pay-per-event Apify actor using the caller's APIFY_TOKEN, so usage is billed to that Apify account.",
        "Prefer small limits (the server already applies a small default maxItems / maxResults).",
        `Store: ${catalog.storeUrl}`,
        `Website: ${catalog.websiteUrl}`,
        `Enabled tools: ${tools.map((t) => t.toolName).join(", ") || "(none)"}`,
      ].join(" "),
    },
  );

  for (const actor of tools) {
    registerActorTool(server, actor);
  }

  server.registerTool(
    "vanborn_labs_catalog",
    {
      title: "Van Born Labs tool catalog",
      description:
        "List Van Born Labs MCP tools and Apify Store actors, including ones that are configured but not yet enabled. Use this to discover YouTube scrapers, Google News, email validators, job scrapers, GTA 6 monitors, hiring signals, ads radar and reviews monitor. No Apify run is started and nothing is billed.",
      annotations: {
        title: "Van Born Labs tool catalog",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const payload = {
        brand: "Van Born Labs",
        store: catalog.storeUrl,
        website: catalog.websiteUrl,
        billing:
          "Set APIFY_TOKEN to your personal Apify API token. Each enabled tool run is billed to your Apify account (pay-per-event).",
        tools: catalog.actors.map((actor) => ({
          tool: actor.toolName,
          title: actor.title,
          enabled: actor.enabled,
          storeUrl: actor.storeUrl,
          price: actor.priceLabel,
          defaultMaxItems: actor.defaultMaxItems,
          limitField: actor.limitField,
        })),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      };
    },
  );

  return server;
}
