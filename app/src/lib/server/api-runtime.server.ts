// Shared server-side request/response runtime: correlation IDs, dynamic status
// simulation, rate-limiting, logging, and the standard response envelope.

import {
  appendLog,
  getSimulation,
  rateLimitTouch,
  type ApiLog,
  type LogSource,
  type StatusOverride,
} from "./store.server";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: {
    requestId: string;
    correlationId: string;
    timestamp: string;
    latencyMs: number;
    path: string;
    method: string;
    source: LogSource;
  };
};

export const ERROR_TABLE: Record<
  Exclude<StatusOverride, "none">,
  { code: string; message: string }
> = {
  "400": { code: "DATA_CONTRACT_VIOLATION", message: "Submitted payload violates the required request contract." },
  "401": { code: "UNAUTHORIZED", message: "Missing or invalid API credentials." },
  "404": { code: "RESOURCE_NOT_FOUND", message: "Requested resource could not be located." },
  "429": { code: "RATE_LIMIT_EXCEEDED", message: "API Gateway rate limit exceeded. Retry after cooldown window." },
  "500": { code: "SYSTEM_FAILURE", message: "Unexpected internal error in the scoring engine." },
  "503": { code: "SERVICE_UNAVAILABLE", message: "Downstream infrastructure is temporarily unavailable." },
};

const BUSINESS_ONLY: Exclude<StatusOverride, "none">[] = ["429"];

function rid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectSource(request: Request): { source: LogSource; userAgent: string } {
  const explicit = request.headers.get("x-client-type");
  const ua = request.headers.get("user-agent") ?? "";
  const known: LogSource[] = ["Lovable UI", "Postman", "n8n Webhook", "curl", "Webhook"];
  if (explicit && (known as string[]).includes(explicit)) {
    return { source: explicit as LogSource, userAgent: ua };
  }
  const uaLower = ua.toLowerCase();
  if (uaLower.includes("postman")) return { source: "Postman", userAgent: ua };
  if (uaLower.includes("n8n") || uaLower.includes("axios")) return { source: "n8n Webhook", userAgent: ua };
  if (uaLower.includes("curl")) return { source: "curl", userAgent: ua };
  if (uaLower.includes("mozilla")) return { source: "Lovable UI", userAgent: ua };
  if (uaLower) return { source: "Unknown", userAgent: ua };
  return { source: "Unknown", userAgent: ua };
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    if (k.toLowerCase().startsWith("authorization")) {
      out[k] = "***redacted***";
    } else {
      out[k] = v;
    }
  });
  return out;
}

export type ApiContext = {
  request: Request;
  path: string;
  method: string;
  requestId: string;
  correlationId: string;
  source: LogSource;
  userAgent: string;
  startedAt: number;
  requestBody: unknown;
  requestHeaders: Record<string, string>;
};

export async function beginRequest(request: Request): Promise<ApiContext> {
  const url = new URL(request.url);
  const { source, userAgent } = detectSource(request);
  const requestId = request.headers.get("x-request-id") ?? rid();
  const correlationId = request.headers.get("x-correlation-id") ?? rid();
  let body: unknown = null;
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
    try {
      const clone = request.clone();
      const text = await clone.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    } catch {
      body = null;
    }
  }
  return {
    request,
    path: url.pathname,
    method: request.method,
    requestId,
    correlationId,
    source,
    userAgent,
    startedAt: Date.now(),
    requestBody: body,
    requestHeaders: headersToObject(request.headers),
  };
}

export function envelope<T>(
  ctx: ApiContext,
  status: number,
  data: T | null,
  error: ApiEnvelope<T>["error"] = null,
): ApiEnvelope<T> {
  return {
    success: status < 400,
    data,
    error,
    meta: {
      requestId: ctx.requestId,
      correlationId: ctx.correlationId,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - ctx.startedAt,
      path: ctx.path,
      method: ctx.method,
      source: ctx.source,
    },
  };
}

function baseHeaders(ctx: ApiContext, extra: Record<string, string> = {}): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "x-service": "credit-scoring-engine",
    "x-request-id": ctx.requestId,
    "x-correlation-id": ctx.correlationId,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-client-type,x-correlation-id,x-request-id,x-simulate-status",
    ...extra,
  };
}

export function optionsResponse(ctx: ApiContext): Response {
  return new Response(null, { status: 204, headers: baseHeaders(ctx) });
}

export function finish<T>(
  ctx: ApiContext,
  status: number,
  data: T | null,
  opts: {
    error?: ApiEnvelope<T>["error"];
    extraHeaders?: Record<string, string>;
  } = {},
): Response {
  const env = envelope(ctx, status, data, opts.error ?? null);
  const headers = baseHeaders(ctx, opts.extraHeaders);
  const log: ApiLog = {
    id: rid(),
    requestId: ctx.requestId,
    correlationId: ctx.correlationId,
    timestamp: env.meta.timestamp,
    method: ctx.method,
    path: ctx.path,
    status,
    latencyMs: env.meta.latencyMs,
    source: ctx.source,
    clientType: ctx.source,
    userAgent: ctx.userAgent,
    responseType: "json",
    requestHeaders: ctx.requestHeaders,
    requestBody: ctx.requestBody,
    responseHeaders: toObj(headers),
    responseBody: env,
    errorMessage: opts.error?.message,
  };
  // Never log a GET on the observability endpoint itself's giant body payload — keep meta only.
  if (ctx.path === "/api/observability/logs" && ctx.method === "GET") {
    log.responseBody = { success: env.success, meta: env.meta, note: "[log entries omitted from audit body]" };
  }
  appendLog(log);
  return new Response(JSON.stringify(env), { status, headers });
}

function toObj(h: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (h instanceof Headers) {
    h.forEach((v, k) => (out[k] = v));
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = v;
  } else {
    Object.assign(out, h as Record<string, string>);
  }
  return out;
}

export function fail(
  ctx: ApiContext,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  return finish(ctx, status, null, { error: { code, message, details }, extraHeaders });
}

/**
 * Runs the dynamic status simulation, checks the global override plus the
 * per-request `X-Simulate-Status` header, and enforces the traffic rate
 * limiter on business endpoints. Returns a Response to short-circuit when a
 * simulated failure fires; otherwise `null` and the caller proceeds.
 */
export function runSimulations(
  ctx: ApiContext,
  opts: { isBusiness: boolean },
): Response | null {
  const sim = getSimulation();
  const headerOv = ctx.request.headers.get("x-simulate-status") as StatusOverride | null;
  const active: StatusOverride =
    headerOv && headerOv !== "none" ? headerOv : sim.statusOverride;

  if (active !== "none") {
    const businessOnly = BUSINESS_ONLY.includes(active as Exclude<StatusOverride, "none">);
    if (!businessOnly || opts.isBusiness) {
      const err = ERROR_TABLE[active as Exclude<StatusOverride, "none">];
      const extra: Record<string, string> = {};
      if (active === "429") extra["retry-after"] = "30";
      return fail(ctx, Number(active), err.code, err.message, undefined, extra);
    }
  }

  if (opts.isBusiness) {
    const limited = rateLimitTouch(Date.now());
    if (limited) {
      return fail(
        ctx,
        429,
        "RATE_LIMIT_EXCEEDED",
        "API Gateway rate limit exceeded. Retry after cooldown window.",
        { windowMs: 10_000, max: 8 },
        { "retry-after": "10" },
      );
    }
  }
  return null;
}
