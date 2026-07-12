// Client HTTP wrapper around the real CreditCore REST API. All calls go over
// the network — the server (src/routes/api/*) is authoritative. UI code
// awaits these functions and receives the standard ApiResponse envelope.

import type {
  ApiLog,
  Assessment,
  AssessmentStatus,
  CreditScoreResult,
  DashboardMetrics,
  LogSource,
  Simulation,
  StatusOverride,
} from "./scoring-store";

// VITE_API_BASE_URL is injected at build time. Empty string = same-origin
// (works in the Lovable preview and in any Docker container that serves both
// the UI and the API on one port).
export const API_BASE_URL: string =
  (typeof import.meta !== "undefined" && (import.meta.env?.VITE_API_BASE_URL as string | undefined)) || "";

export type AssessmentPayload = {
  accountId: string;
  borrowerName: string;
  requestedAmount: number;
  monthlyIncome: number;
  employmentLengthMonths: number;
  purposeOfLoan: string;
  numberOfDependents: number;
  slikStatus: string;
};

export type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

export type ApiResponse<T> = {
  status: number;
  ok: boolean;
  data: T | ApiErrorBody;
  correlationId: string;
  requestId?: string;
  errorCode?: string;
};

type ServerEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: { requestId: string; correlationId: string; timestamp: string; latencyMs: number; path: string; method: string; source: LogSource };
};

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (!headers.has("x-client-type")) headers.set("x-client-type", "Lovable UI");
  const url = `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    return {
      status: 0, ok: false,
      data: { error: { code: "NETWORK_ERROR", message: (e as Error).message } },
      correlationId: "",
      errorCode: "NETWORK_ERROR",
    };
  }
  const cid = res.headers.get("x-correlation-id") ?? "";
  const rid = res.headers.get("x-request-id") ?? undefined;
  let env: ServerEnvelope<T> | null = null;
  try { env = (await res.json()) as ServerEnvelope<T>; } catch { env = null; }
  if (!env) {
    return {
      status: res.status, ok: res.ok,
      data: { error: { code: "INVALID_RESPONSE", message: "Non-JSON response from API." } },
      correlationId: cid, requestId: rid, errorCode: "INVALID_RESPONSE",
    };
  }
  if (env.success && env.data !== null) {
    return { status: res.status, ok: true, data: env.data, correlationId: env.meta.correlationId, requestId: env.meta.requestId };
  }
  return {
    status: res.status, ok: false,
    data: { error: env.error ?? { code: "UNKNOWN", message: "Unknown error" } },
    correlationId: env.meta?.correlationId ?? cid,
    requestId: env.meta?.requestId ?? rid,
    errorCode: env.error?.code,
  };
}

// --- Business API ---------------------------------------------------------

export function postAssessment(
  payload: Partial<AssessmentPayload>,
): Promise<ApiResponse<{ assessmentId: string; status: AssessmentStatus; createdAt: string }>> {
  return call("/api/assessments", { method: "POST", body: JSON.stringify(payload) });
}
export function getAssessment(id: string): Promise<ApiResponse<Assessment>> {
  return call(`/api/assessments/${encodeURIComponent(id)}`);
}
export function getCreditScore(
  id: string,
): Promise<ApiResponse<CreditScoreResult & { assessmentId: string; accountId: string; borrowerName: string; assessmentStatus: AssessmentStatus; assessmentTimestamp: string }>> {
  return call(`/api/credit-scores/${encodeURIComponent(id)}`);
}
export function patchAssessmentStatus(
  id: string,
  status: string,
): Promise<ApiResponse<Assessment>> {
  return call(`/api/assessments/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
export function listAssessments(): Promise<ApiResponse<{ count: number; items: Assessment[] }>> {
  return call("/api/assessments");
}

// --- Infrastructure -------------------------------------------------------

export function getHealth(): Promise<ApiResponse<{ status: string; service: string }>> {
  return call("/api/health");
}
export function getObservabilityLogs(): Promise<ApiResponse<{ count: number; logs: ApiLog[] }>> {
  return call("/api/observability/logs");
}
export function deleteObservabilityLogs(): Promise<ApiResponse<{ cleared: true }>> {
  return call("/api/observability/logs", { method: "DELETE" });
}
export function getSimulationApi(): Promise<ApiResponse<Simulation>> {
  return call("/api/simulation");
}
export function putSimulation(sim: Partial<Simulation>): Promise<ApiResponse<Simulation>> {
  return call("/api/simulation", { method: "PUT", body: JSON.stringify(sim) });
}
export function getDashboardApi(): Promise<ApiResponse<DashboardMetrics>> {
  return call("/api/dashboard");
}

// --- Convenience helpers for the mirror store (never throw) ---------------

export async function fetchDashboard(): Promise<DashboardMetrics | null> {
  const r = await getDashboardApi();
  return r.ok ? (r.data as DashboardMetrics) : null;
}
export async function fetchLogs(): Promise<ApiLog[] | null> {
  const r = await getObservabilityLogs();
  return r.ok ? (r.data as { logs: ApiLog[] }).logs : null;
}
export async function fetchSimulation(): Promise<Simulation | null> {
  const r = await getSimulationApi();
  return r.ok ? (r.data as Simulation) : null;
}

// Client-side convenience: change simulation on the server (single source of truth).
export async function setSimulation(patch: Partial<Simulation>): Promise<Simulation | null> {
  const r = await putSimulation(patch);
  return r.ok ? (r.data as Simulation) : null;
}
export async function clearLogs(): Promise<boolean> {
  const r = await deleteObservabilityLogs();
  return r.ok;
}

// Re-export StatusOverride so callers importing from scoring-api keep working.
export type { StatusOverride };
