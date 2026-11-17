#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createServer } from "./server.js";

function printHelp(): void {
  process.stderr.write(`Van Born Labs MCP server

Usage:
  vanborn-labs-mcp              Start over stdio (Claude Desktop, Cursor, npx)
  vanborn-labs-mcp --http       Start Streamable HTTP on 127.0.0.1:8080/mcp
  vanborn-labs-mcp --http --host 0.0.0.0 --port 8080

Environment:
  APIFY_TOKEN                 Required to call tools (your personal Apify token)
  VANBORN_LABS_MCP_CONFIG     Optional path to a custom actors.json
  VANBORN_LABS_MCP_ROOT       Optional package root (actors.json + schemas/)

Docs: https://arkadiuszvanborn.com/labs
Store: https://apify.com/vanborn_labs
`);
}

async function startStdio(): Promise<void> {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("vanborn-labs-mcp listening on stdio\n");
}

async function startHttp(host: string, port: number): Promise<void> {
  const { default: express } = await import("express");
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      process.stderr.write(`HTTP /mcp error: ${err instanceof Error ? err.message : String(err)}\n`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST for Streamable HTTP." },
      id: null,
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: "vanborn-labs-mcp" });
  });

  await new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(port, host, () => {
      process.stderr.write(`vanborn-labs-mcp Streamable HTTP on http://${host}:${port}/mcp\n`);
      resolve();
    });
    httpServer.on("error", reject);
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      http: { type: "boolean", default: false },
      port: { type: "string", default: "8080" },
      host: { type: "string", default: "127.0.0.1" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (values.http) {
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      process.stderr.write("Invalid --port\n");
      process.exitCode = 1;
      return;
    }
    await startHttp(values.host ?? "127.0.0.1", port);
    return;
  }

  await startStdio();
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
