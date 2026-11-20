# Publishing Van Born Labs MCP

The public GitHub repository is already created:

https://github.com/arkaduush-code/vanborn-labs-mcp

Do **not** `npm publish`, and do **not** submit to Smithery or Glama, until the project owner asks you to. The browser sign-in steps below are for the owner.

Checked against the live public pages on 16 November 2026 (America/Phoenix). No Smithery or Glama account was created or signed into from this project.

## 1. GitHub (done)

Repo: https://github.com/arkaduush-code/vanborn-labs-mcp  
Default branch: `main`  
Visibility: public  
Homepage: https://vanbornlabs.com  
`glama.json` maintainers: `arkaduush-code`

## 2. npm account and publish (not done)

The package name `vanborn-labs-mcp` was unchecked on 16 November 2026 and was available. Confirm again before publishing.

1. Create or log in to an npm account that should own the package.
2. Publish from a clean build (this does **not** run automatically):

```bash
npm login
npm whoami
npm run build
npm pack --dry-run    # review the tarball contents; no secrets should be included
npm publish --access public
```

3. Verify with `npx -y vanborn-labs-mcp --help` and on https://www.npmjs.com/package/vanborn-labs-mcp

To cut a later version: bump `version` in `package.json` (and `SERVER_VERSION` in `src/server.ts`), commit, `npm publish`.

## 3. Smithery

**Status on 16 November 2026: Smithery does not currently accept a self-serve GitHub-repo submission.**

Official notice: [https://www.smithery.ai/future](https://www.smithery.ai/future)

Smithery’s MCP proxy, accounts, API keys, and CLI shut down on 31 October 2026. The site remains a public directory of MCP servers, now powered by Arcade.dev:

- Directory: [https://smithery.ai/servers](https://smithery.ai/servers)
- Home: [https://smithery.ai](https://smithery.ai)

These former publish/deploy URLs now return 404:

- https://smithery.ai/new
- https://smithery.ai/publish
- https://smithery.ai/servers/new

`smithery.yaml` and the `Dockerfile` stay in this repo so the project is ready if a submit form comes back. If that happens, use this GitHub URL:

https://github.com/arkaduush-code/vanborn-labs-mcp

The config schema should collect the user’s `apifyToken` and pass it as `APIFY_TOKEN`. Until then, there is no working public form to log into or to point at this repository. The shutdown notice lists ani at smithery.ai for migration questions; that is not a confirmed listing request path.

## 4. Glama (accepts a GitHub repo — owner does this in the browser)

Glama does accept open-source MCP servers from a public GitHub repository. Official instructions: [https://glama.ai/mcp/faq#faq-submit-mcp-server](https://glama.ai/mcp/faq#faq-submit-mcp-server)

1. Open [https://glama.ai/mcp/servers](https://glama.ai/mcp/servers).
2. Sign in with GitHub if asked ([https://glama.ai/sign-in](https://glama.ai/sign-in)). Use the `arkaduush-code` GitHub account that owns this repo.
3. Click **Add Server** (the FAQ also calls this **Add MCP Server**).
4. Fill in:
   - GitHub repository URL: `https://github.com/arkaduush-code/vanborn-labs-mcp`
   - Display name: `Van Born Labs MCP`
   - Short description: `MCP server for Van Born Labs data tools: YouTube outliers and comments, ATS jobs, Google News, and email validation, via Apify.`
5. Wait for Glama’s automated checks (license, security scan, health test). Most listings appear within minutes.
6. Claim the listing if it is not already tied to this account. Because the repo is under the personal `arkaduush-code` account, signing in with that GitHub user is enough. `glama.json` already lists `arkaduush-code` as a maintainer (needed if the repo later moves under an organization). If you change `glama.json`, run **Claim ownership** again so Glama re-reads it. Docs: [https://glama.ai/blog/2025-07-08-what-is-glamajson](https://glama.ai/blog/2025-07-08-what-is-glamajson)
7. After you maintain the listing, you can edit the name, description, categories and README under **Admin → Listing**, and the build / env vars under **Admin → Dockerfile**. Users will need `APIFY_TOKEN` (their own Apify token) for tool calls.

Do not submit a Glama **connector** (hosted HTTPS endpoint) until this server is actually deployed at a public URL. That flow is separate: [https://glama.ai/mcp/faq#faq-submit-mcp-connector](https://glama.ai/mcp/faq#faq-submit-mcp-connector).

## 5. Official MCP Registry (optional, not done)

```bash
# after the npm package exists
# install mcp-publisher from https://github.com/modelcontextprotocol/registry/releases
# add a server.json (not included yet) and then:
mcp-publisher login github
mcp-publisher publish
```

Glama can also pick up hosted endpoints from the official registry on an hourly sync.

## 6. After the next Apify publish

When the queued actors go public (GTA 6 tools, Hiring Signals, Ads Radar, Reviews Monitor, and the others already listed in `actors.json`):

1. Set `"enabled": true` on those entries.
2. Bump the package version and, if npm is already published, publish a new release so clients pick up the tools.

## Still not done

- No npm account is configured in this project, and the package has not been published.
- No Smithery or Glama listing has been submitted.
