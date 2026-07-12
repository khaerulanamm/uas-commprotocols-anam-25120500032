// Client-side cache of server state. Contains NO business logic and NO seed
// data — the server (see src/lib/server/store.server.ts) is the single source
// of truth. This module only mirrors server responses into a subscribable
// store so React components can render without wiring queries everywhere.

import { useEffect } from "react";
import { useSyncExternalStore } from "react";

export type AssessmentStatus = "Pending" | "Scored" | "Completed" | "Failed";
export type RiskGrade = "Low" | "Medium" | "High";
export type Decision = "Approved" | "Rejected" | "Review";
export type LogSource = "Lovable UI" | "Postman" | "n8n Webhook" | "curl" | "Webhook" | "Unknown";
export type StatusOverride = "none" | "400" | "401" | "404" | "429" | "500" | "503";

export type CreditScoreResult = {
  creditScore: number;
  riskGrade: RiskGrade;
  slikStatus: string;
  decision: Decision;
  probabilityOfDefault: number;
};

export type Assessment = {
  assessmentId: string;
  accountId: string;
  borrowerName: string;
  requestedAmount: number;
  monthlyIncome: number;
  employmentLengthMonths: number;
  purposeOfLoan: string;
  numberOfDependents: number;
  slikStatus: string;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
  score?: CreditScoreResult;
};

export type ApiLog = {
  id: string;
  requestId: string;
  correlationId: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  source: LogSource;
  clientType?: LogSource;
  userAgent?: string;
  responseType: "json";
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  errorMessage?: string;
};

export type Simulation = {
  statusOverride: StatusOverride;
  source: LogSource;
};

export type DashboardMetrics = {
  totalAssessments: number;
  averageCreditScore: number;
  approvalRate: number;
  approvedCount: number;
  averageRequestedAmount: number;
  averageMonthlyIncome: number;
  highRiskAssessments: number;
  todaysRequests: number;
  completedCases: number;
  recentAssessments: Assessment[];
};

type State = {
  assessments: Assessment[];
  logs: ApiLog[];
  simulation: Simulation;
  dashboard: DashboardMetrics | null;
};

let state: State = {
  assessments: [],
  logs: [],
  simulation: { statusOverride: "none", source: "Lovable UI" },
  dashboard: null,
};
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
export function getState(): State { return state; }
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function hydrate(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

// Trigger a background sync from the server every N ms.
import { fetchDashboard, fetchLogs, fetchSimulation } from "./scoring-api";

export function useServerSync(intervalMs = 4000) {
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const [dash, logs, sim] = await Promise.all([
          fetchDashboard().catch(() => null),
          fetchLogs().catch(() => null),
          fetchSimulation().catch(() => null),
        ]);
        if (cancelled) return;
        const patch: Partial<State> = {};
        if (dash) {
          patch.dashboard = dash;
          patch.assessments = dash.recentAssessments;
        }
        if (logs) patch.logs = logs;
        if (sim) patch.simulation = sim;
        if (Object.keys(patch).length) hydrate(patch);
      } catch {
        /* ignore */
      }
    }
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);
}
