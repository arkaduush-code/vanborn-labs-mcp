import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface ActorConfig {
  toolName: string;
  actorId: string;
  actorNumericId: string;
  actorName: string;
  storeUrl: string;
  title: string;
  description: string;
  enabled: boolean;
  schemaFile: string;
  limitField?: string;
  defaultMaxItems: number;
  timeoutSecs: number;
  pricePerResultUsd?: number;
  priceLabel?: string;
  startPriceUsd?: number;
}

export interface Catalog {
  namespace: string;
  storeUrl: string;
  websiteUrl: string;
  actors: ActorConfig[];
}

const here = path.dirname(fileURLToPath(import.meta.url));

/** Package root (actors.json + schemas/), whether running from src/ or dist/. */
export function packageRoot(): string {
  const override = process.env.VANBORN_LABS_MCP_ROOT;
  if (override) return path.resolve(override);
  const candidates = [path.resolve(here, ".."), path.resolve(here, "../..")];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "actors.json"))) return dir;
  }
  return candidates[0];
}

export function loadCatalog(): Catalog {
  const configPath =
    process.env.VANBORN_LABS_MCP_CONFIG ?? path.join(packageRoot(), "actors.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const catalog = JSON.parse(raw) as Catalog;
  if (!Array.isArray(catalog.actors)) {
    throw new Error(`Invalid catalog at ${configPath}: missing actors array`);
  }
  return catalog;
}

export function enabledActors(catalog: Catalog = loadCatalog()): ActorConfig[] {
  return catalog.actors.filter((actor) => actor.enabled);
}

export function loadInputSchema(actor: ActorConfig): Record<string, unknown> {
  const schemaPath = path.isAbsolute(actor.schemaFile)
    ? actor.schemaFile
    : path.join(packageRoot(), actor.schemaFile);
  const raw = fs.readFileSync(schemaPath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}
