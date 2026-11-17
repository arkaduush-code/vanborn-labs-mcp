# Publishing Van Born Labs MCP (do not run yet)

Nothing in this file has been executed. Do not create accounts, do not `npm publish`, and do not submit to Smithery or Glama until the project owner asks you to.

## 1. GitHub repository

1. Create a public GitHub repository (for example `vanborn-labs/vanborn-labs-mcp` or under the owner’s personal account).
2. Put that URL in `package.json` as `repository` / `homepage` if you want npm to link it.
3. Add the GitHub username to `glama.json` → `maintainers` (required to claim the Glama listing).
4. Push this project (`actors.json`, `schemas/`, `src/`, `README.md`, `LICENSE`, `smithery.yaml`, `Dockerfile`, `glama.json`).

```bash
git init
git add .
git commit -m "Initial Van Born Labs MCP server"
git remote add origin <repo-url>
git push -u origin main
```

## 2. npm account and publish

The package name `vanborn-labs-mcp` was unchecked on 2026-11-16 and was available. Confirm again before publishing.

1. Create or log in to an npm account that should own the package (Van Born Labs or the owner’s account).
2. For a scoped name such as `@vanborn-labs/mcp` you would first create the npm org. This repo uses the unscoped name for a simpler first publish.
3. Publish from a clean build (this does **not** run automatically):

```bash
npm login
npm whoami
npm run build
npm pack --dry-run    # review the tarball contents; no secrets should be included
npm publish --access public
```

4. Verify with `npx -y vanborn-labs-mcp --help` and on https://www.npmjs.com/package/vanborn-labs-mcp

To cut a later version: bump `version` in `package.json` (and `SERVER_VERSION` in `src/server.ts`), commit, `npm publish`.

## 3. Smithery

Files already in the repo: `smithery.yaml` (stdio start command, `apifyToken` → `APIFY_TOKEN`).

1. Create or log in to a Smithery account (https://smithery.ai) with GitHub.
2. Deploy / add server → select the GitHub repository.
3. Confirm the config schema asks for the user’s Apify token.
4. Optional CLI (only after login): `npx @smithery/cli publish` or the dashboard “Deploy” flow documented at the time of publish.

Smithery page will look like `https://smithery.ai/server/@<org>/vanborn-labs-mcp` once accepted.

## 4. Glama

Files already in the repo: `glama.json`.

1. Push the repo to GitHub and add the GitHub username to `maintainers`.
2. Log in at https://glama.ai with GitHub.
3. Add MCP server → paste the GitHub repository URL, name and short description.
4. Claim ownership so the `glama.json` maintainers can edit the listing.

Glama also indexes from the official MCP Registry if you later publish there.

## 5. Official MCP Registry (optional)

```bash
# after the npm package exists
# install mcp-publisher from https://github.com/modelcontextprotocol/registry/releases
# add a server.json (not included yet) and then:
mcp-publisher login github
mcp-publisher publish
```

## 6. After tomorrow’s Apify publish

When the queued actors go public (GTA 6 tools, Hiring Signals, Ads Radar, Reviews Monitor, and the others already listed in `actors.json`):

1. Set `"enabled": true` on those entries.
2. Bump the package version and publish a new npm release so clients pick up the tools.

## Blockers (as of this draft)

- No npm account is configured in this project.
- No GitHub repository has been created for this package.
- No Smithery or Glama login has been made, and no listings have been submitted.
- `glama.json` `maintainers` is empty until a GitHub username is known.
