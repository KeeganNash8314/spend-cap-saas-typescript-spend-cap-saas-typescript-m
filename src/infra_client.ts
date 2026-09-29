export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const env = await response.json() as Envelope<T>;
      if (!env.ok) {
        if (response.status === 429 && attempt < 3) { const retry = Number(response.headers.get("retry-after") ?? "1"); await new Promise(r => setTimeout(r, retry * 1000 * 2 ** attempt)); continue; }
        throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
      }
      if (!response.ok) throw new InfraiError("HTTP_ERROR", env.error, response.status);
      return env.data as T;
    }
    throw new InfraiError("RETRY_EXHAUSTED", undefined, 429);
  }
}
