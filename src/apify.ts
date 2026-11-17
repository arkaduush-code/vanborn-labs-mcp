const APIFY_API = "https://api.apify.com/v2";

export class ApifyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly bodyPreview: string,
  ) {
    super(message);
    this.name = "ApifyRequestError";
  }
}

export interface RunSyncResult {
  items: unknown[];
  status: number;
  itemCount: number;
  total?: number;
}

function redact(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/([?&]token=)[^&\s"]+/gi, "$1[redacted]")
    .replace(/apify_api_[A-Za-z0-9]+/g, "[redacted]");
}

/**
 * POST /v2/acts/:actorId/run-sync-get-dataset-items
 * Token is sent as an Authorization header, never in the URL or logs.
 */
export async function runSyncGetDatasetItems(options: {
  actorId: string;
  token: string;
  input: unknown;
  timeoutSecs: number;
  memoryMbytes?: number;
}): Promise<RunSyncResult> {
  const { actorId, token, input, timeoutSecs, memoryMbytes } = options;
  const url = new URL(`${APIFY_API}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`);
  url.searchParams.set("timeout", String(Math.min(Math.max(timeoutSecs, 1), 300)));
  if (memoryMbytes) url.searchParams.set("memory", String(memoryMbytes));

  const controller = new AbortController();
  const kill = setTimeout(() => controller.abort(), (Math.min(timeoutSecs, 300) + 20) * 1000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input ?? {}),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      const preview = redact(text).slice(0, 2000);
      const hint =
        res.status === 401 || res.status === 403
          ? "Check that APIFY_TOKEN is a valid personal Apify API token."
          : res.status === 402
            ? "The Apify account is out of prepaid usage. Add credit at https://console.apify.com/billing."
            : res.status === 404
              ? "Actor not found or not available to this token. If it is still private, wait until it is published, or run it from an account that has access."
              : res.status === 408
                ? "The actor run exceeded the sync timeout. Retry with a smaller maxItems value."
                : "The Apify API returned an error.";
      throw new ApifyRequestError(`Apify ${res.status}: ${hint} ${preview}`.trim(), res.status, preview);
    }

    const parsed = text ? JSON.parse(text) : [];
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const totalHeader = res.headers.get("x-apify-pagination-total");
    return {
      items,
      status: res.status,
      itemCount: items.length,
      total: totalHeader ? Number(totalHeader) : items.length,
    };
  } catch (err) {
    if (err instanceof ApifyRequestError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApifyRequestError(
        `The actor run was aborted after ${timeoutSecs}s. Retry with a smaller maxItems value.`,
        408,
        "",
      );
    }
    const message = err instanceof Error ? redact(err.message) : "Unknown error calling Apify";
    throw new ApifyRequestError(message, 0, "");
  } finally {
    clearTimeout(kill);
  }
}

export function getApifyToken(): string | undefined {
  const token = process.env.APIFY_TOKEN?.trim();
  return token || undefined;
}
