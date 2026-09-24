export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export type FetchContext = {
  fetch?: Fetcher;
  /** Wikimedia and AIC require a descriptive agent with contact details (CONTENT_USER_AGENT). */
  userAgent: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET/POST JSON with one polite retry on 429/503, honouring Retry-After (capped at 30 s). */
export async function fetchJson<T>(url: string, init: RequestInit, context: FetchContext): Promise<T> {
  const doFetch = context.fetch ?? fetch;
  for (let attempt = 0; ; attempt++) {
    const response = await doFetch(url, init);
    if (response.ok) return (await response.json()) as T;
    if ((response.status === 429 || response.status === 503) && attempt === 0) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Math.min(30, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5) * 1000);
      continue;
    }
    throw new Error(`${init.method ?? "GET"} ${new URL(url).host} failed: ${response.status}`);
  }
}
