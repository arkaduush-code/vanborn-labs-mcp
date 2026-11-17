# Van Born Labs MCP Server

Model Context Protocol (MCP) server for **[Van Born Labs](https://apify.com/vanborn_labs)** data tools. AI assistants such as **Claude**, **Cursor**, **ChatGPT** (connectors) and **Grok** can discover and call YouTube scrapers, a Google News RSS scraper, an email and domain validator, ATS job scrapers, and more.

Store: [apify.com/vanborn_labs](https://apify.com/vanborn_labs)  
Website: [arkadiuszvanborn.com/labs](https://arkadiuszvanborn.com/labs)

You bring **your own [Apify](https://apify.com) API token**. Each tool starts a Van Born Labs **pay-per-event** actor on your account, so you are billed for the run and we earn the developer share. The server never uses a shared token.

## Tools

Enabled today (public on the Apify Store):

| Tool | What it does | Price (pay-per-event) |
| --- | --- | --- |
| `youtube_video_details` | YouTube video details, views, likes, tags, chapters and outlier score | $0.80 / 1,000 videos |
| `youtube_comments` | YouTube comments and replies from videos, Shorts, channels or search | $1.00 / 1,000 comments |
| `ats_career_jobs` | Jobs from Greenhouse, Lever, Ashby, Workable and other public ATS boards | $2.00 / 1,000 jobs |
| `google_news_rss` | Google News headlines by keyword, topic, site or country | $1.00 / 1,000 articles |
| `email_domain_validator` | Email and domain validation: syntax, typos, MX, SPF, DMARC, disposable | $0.50 / 1,000 results |
| `vanborn_labs_catalog` | Lists every configured tool (including ones not yet enabled). Free, no run. | — |

More actors are already in `actors.json` with `"enabled": false` and will be switched on after they are published on the Store, including GTA 6 news and viral-clip trackers, Content Rewards campaign tools, Company Hiring Signals, Competitor Ads Radar, Unified Reviews Monitor, Google Ads Transparency, Website SEO Audit, YouTube Shorts outliers, Google Trends and the Apple App Store scraper.

Each tool uses the actor’s official input schema. If you omit the limit field (`maxItems`, `maxResults`, `maxJobs`, …), the server applies a **small default** so a casual prompt does not start a large, expensive run.

## Install

Requirements: Node.js 18.18 or later, and an Apify API token from [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations).

### npx (recommended)

```bash
npx -y vanborn-labs-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vanborn-labs": {
      "command": "npx",
      "args": ["-y", "vanborn-labs-mcp"],
      "env": {
        "APIFY_TOKEN": "your_apify_token"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Add this to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "vanborn-labs": {
      "command": "npx",
      "args": ["-y", "vanborn-labs-mcp"],
      "env": {
        "APIFY_TOKEN": "your_apify_token"
      }
    }
  }
}
```

### Streamable HTTP (ChatGPT connectors, remote hosts, Docker)

```bash
npx -y vanborn-labs-mcp --http --host 127.0.0.1 --port 8080
```

The MCP endpoint is `http://127.0.0.1:8080/mcp` (POST). Health check: `GET /health`.

For a container:

```bash
docker build -t vanborn-labs-mcp .
docker run --rm -e APIFY_TOKEN=your_apify_token -p 8080:8080 vanborn-labs-mcp
```

### From source

```bash
git clone <repo-url>
cd vanborn-labs-mcp
npm install
npm run build
node dist/index.js
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `APIFY_TOKEN` | **Required to call tools.** Your personal Apify API token. Never committed. |
| `VANBORN_LABS_MCP_CONFIG` | Optional path to a custom `actors.json`. |
| `VANBORN_LABS_MCP_ROOT` | Optional package root if `actors.json` and `schemas/` live elsewhere. |

The tool list is driven by [`actors.json`](./actors.json). To add an actor after it is published:

1. Fetch its input schema (or run `npm run sync-schemas` with `APIFY_TOKEN`).
2. Add one entry to `actors.json` with `toolName`, `actorId` (`username~name`), `schemaFile`, `limitField`, `defaultMaxItems`, `timeoutSecs` and a keyword-rich `description`.
3. Set `"enabled": true`.
4. Rebuild.

Input schemas in `schemas/` were taken from each actor’s input schema via the Apify API.

## Development

```bash
npm install
npm run build
npm test          # list tools + two cheap live runs (needs APIFY_TOKEN; keep under $0.05)
npx -y @modelcontextprotocol/inspector node dist/index.js
```

## Publishing

This package is ready to publish but is **not published yet**. See [PUBLISH.md](./PUBLISH.md) for the npm, GitHub, Smithery and Glama steps. Do not run those steps until the accounts and repository exist.

## License

MIT © Van Born Labs
