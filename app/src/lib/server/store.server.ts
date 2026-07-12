// Server-side authoritative store for the CreditCore Mock API.
// Module-level singleton — survives across requests within the same server
// process (dev server / node container). All business logic (scoring,
// seeding, log accounting, simulation flags) lives here — the frontend is a
// dumb HTTP client and cannot influence these values without going through
// the REST API.

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
  clientType: LogSource;
  userAgent: string;
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

type ServerState = {
  assessments: Assessment[];
  logs: ApiLog[];
  simulation: Simulation;
  rateWindow: number[]; // ms timestamps for rate limiter
};

const GLOBAL_KEY = "__creditcore_server_store__";

function scoreFor(
  amount: number,
  income: number,
  tenure: number,
  slik: string,
): CreditScoreResult {
  const dti = amount / Math.max(income * Math.max(tenure, 1), 1);
  const base = 820 - Math.min(dti * 900, 320);
  const slikPenalty =
    slik === "Kolektibilitas 1"
      ? 0
      : slik === "Kolektibilitas 2"
        ? 40
        : slik === "Kolektibilitas 3"
          ? 90
          : slik === "Kolektibilitas 4"
            ? 140
            : 200;
  const creditScore = Math.max(320, Math.min(850, Math.round(base - slikPenalty)));
  const riskGrade: RiskGrade =
    creditScore >= 720 ? "Low" : creditScore >= 620 ? "Medium" : "High";
  const decision: Decision =
    creditScore >= 700 ? "Approved" : creditScore >= 600 ? "Review" : "Rejected";
  const probabilityOfDefault = Math.max(
    0.01,
    Math.min(0.6, +(1 - (creditScore - 300) / 550).toFixed(3)),
  );
  return { creditScore, riskGrade, slikStatus: slik, decision, probabilityOfDefault };
}

function seed(): ServerState {
  const rows: Array<Omit<Assessment, "assessmentId" | "createdAt" | "updatedAt" | "status" | "score">> = [
    { accountId: "ACC-2026-0031", borrowerName: "Andi Wijaya", requestedAmount: 25000000, monthlyIncome: 12000000, employmentLengthMonths: 48, purposeOfLoan: "Home Renovation", numberOfDependents: 2, slikStatus: "Kolektibilitas 1" },
    { accountId: "ACC-2026-0032", borrowerName: "Sri Lestari", requestedAmount: 80000000, monthlyIncome: 22000000, employmentLengthMonths: 72, purposeOfLoan: "Business Venture", numberOfDependents: 1, slikStatus: "Kolektibilitas 1" },
    { accountId: "ACC-2026-0033", borrowerName: "Bagas Prasetyo", requestedAmount: 15000000, monthlyIncome: 7500000, employmentLengthMonths: 18, purposeOfLoan: "Consumer Goods", numberOfDependents: 0, slikStatus: "Kolektibilitas 2" },
    { accountId: "ACC-2026-0034", borrowerName: "Dewi Kartika", requestedAmount: 45000000, monthlyIncome: 18000000, employmentLengthMonths: 60, purposeOfLoan: "Education", numberOfDependents: 3, slikStatus: "Kolektibilitas 1" },
    { accountId: "ACC-2026-0035", borrowerName: "Rizal Hakim", requestedAmount: 120000000, monthlyIncome: 9000000, employmentLengthMonths: 12, purposeOfLoan: "Business Venture", numberOfDependents: 4, slikStatus: "Kolektibilitas 3" },
    { accountId: "ACC-2026-0036", borrowerName: "Maya Anggraini", requestedAmount: 30000000, monthlyIncome: 15000000, employmentLengthMonths: 36, purposeOfLoan: "Home Renovation", numberOfDependents: 1, slikStatus: "Kolektibilitas 1" },
    { accountId: "ACC-2026-0037", borrowerName: "Fajar Nugroho", requestedAmount: 60000000, monthlyIncome: 25000000, employmentLengthMonths: 84, purposeOfLoan: "Education", numberOfDependents: 2, slikStatus: "Kolektibilitas 1" },
    { accountId: "ACC-2026-0038", borrowerName: "Nina Rahmawati", requestedAmount: 20000000, monthlyIncome: 6000000, employmentLengthMonths: 24, purposeOfLoan: "Consumer Goods", numberOfDependents: 2, slikStatus: "Kolektibilitas 2" },
    { accountId: "ACC-2026-0039", borrowerName: "Yoga Pratama", requestedAmount: 95000000, monthlyIncome: 30000000, employmentLengthMonths: 96, purposeOfLoan: "Business Venture", numberOfDependents: 1, slikStatus: "Kolektibilitas 1" },
    { accountId: "ACC-2026-0040", borrowerName: "Intan Permata", requestedAmount: 40000000, monthlyIncome: 10000000, employmentLengthMonths: 30, purposeOfLoan: "Home Renovation", numberOfDependents: 3, slikStatus: "Kolektibilitas 2" },
    { accountId: "ACC-2026-0041", borrowerName: "Bima Saputra", requestedAmount: 200000000, monthlyIncome: 8000000, employmentLengthMonths: 6, purposeOfLoan: "Business Venture", numberOfDependents: 5, slikStatus: "Kolektibilitas 4" },
    { accountId: "ACC-2026-0042", borrowerName: "Anam Setiawan", requestedAmount: 10000000, monthlyIncome: 15000000, employmentLengthMonths: 24, purposeOfLoan: "Business Venture", numberOfDependents: 2, slikStatus: "Kolektibilitas 1" },
  ];
  const now = Date.now();
  const assessments: Assessment[] = rows.map((r, i) => {
    const created = new Date(now - (rows.length - i) * 3600_000 * 5).toISOString();
    const score = scoreFor(r.requestedAmount, r.monthlyIncome, r.employmentLengthMonths, r.slikStatus);
    return {
      ...r,
      assessmentId: `ASM-2026-${String(i + 1).padStart(4, "0")}`,
      status: "Completed",
      createdAt: created,
      updatedAt: created,
      score,
    };
  });
  const logs: ApiLog[] = assessments.slice(-4).map((a, idx) => ({
    id: cryptoRandom(),
    requestId: cryptoRandom(),
    correlationId: cryptoRandom(),
    timestamp: new Date(now - (4 - idx) * 900_000).toISOString(),
    method: "POST",
    path: "/api/assessments",
    status: 201,
    latencyMs: 60 + Math.floor(Math.random() * 80),
    source: "Lovable UI",
    clientType: "Lovable UI",
    userAgent: "seed/1.0",
    responseType: "json",
    requestHeaders: { "content-type": "application/json" },
    requestBody: {
      accountId: a.accountId,
      borrowerName: a.borrowerName,
      requestedAmount: a.requestedAmount,
      monthlyIncome: a.monthlyIncome,
      employmentLengthMonths: a.employmentLengthMonths,
      purposeOfLoan: a.purposeOfLoan,
      numberOfDependents: a.numberOfDependents,
      slikStatus: a.slikStatus,
    },
    responseHeaders: { "content-type": "application/json; charset=utf-8" },
    responseBody: { assessmentId: a.assessmentId, status: "Pending", createdAt: a.createdAt },
  }));
  return {
    assessments,
    logs,
    simulation: { statusOverride: "none", source: "Lovable UI" },
    rateWindow: [],
  };
}

function cryptoRandom(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getStore(): ServerState {
  const g = globalThis as unknown as Record<string, ServerState | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = seed();
  return g[GLOBAL_KEY]!;
}

export function resetStore(): void {
  const g = globalThis as unknown as Record<string, ServerState | undefined>;
  g[GLOBAL_KEY] = seed();
}

// ---------- Public server-side accessors ----------

export function listAssessments(): Assessment[] {
  return [...getStore().assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function findAssessment(id: string): Assessment | undefined {
  return getStore().assessments.find((a) => a.assessmentId === id);
}
export function nextAssessmentId(): string {
  const nums = getStore().assessments
    .map((a) => Number(a.assessmentId.split("-").pop()))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `ASM-2026-${String(n).padStart(4, "0")}`;
}
export function createAssessment(input: {
  accountId: string;
  borrowerName: string;
  requestedAmount: number;
  monthlyIncome: number;
  employmentLengthMonths: number;
  purposeOfLoan: string;
  numberOfDependents: number;
  slikStatus: string;
}): Assessment {
  const now = new Date().toISOString();
  const assessmentId = nextAssessmentId();
  const score = scoreFor(
    input.requestedAmount,
    input.monthlyIncome,
    input.employmentLengthMonths,
    input.slikStatus,
  );
  const a: Assessment = {
    ...input,
    assessmentId,
    status: "Completed",
    createdAt: now,
    updatedAt: now,
    score,
  };
  getStore().assessments.push(a);
  return a;
}
export function updateAssessmentStatus(
  id: string,
  status: AssessmentStatus,
): Assessment | undefined {
  const a = findAssessment(id);
  if (!a) return undefined;
  a.status = status;
  a.updatedAt = new Date().toISOString();
  return a;
}

export function getSimulation(): Simulation {
  return { ...getStore().simulation };
}
export function setSimulation(sim: Partial<Simulation>): Simulation {
  const s = getStore().simulation;
  if (sim.statusOverride) s.statusOverride = sim.statusOverride;
  if (sim.source) s.source = sim.source;
  return { ...s };
}

export function listLogs(): ApiLog[] {
  return [...getStore().logs].reverse();
}
export function appendLog(log: ApiLog): void {
  const s = getStore();
  s.logs.push(log);
  if (s.logs.length > 500) s.logs.splice(0, s.logs.length - 500);
}
export function clearLogs(): void {
  getStore().logs = [];
}

export function rateLimitTouch(now: number, windowMs = 10_000, max = 8): boolean {
  const s = getStore();
  s.rateWindow = s.rateWindow.filter((t) => now - t < windowMs);
  s.rateWindow.push(now);
  return s.rateWindow.length > max;
}

export function dashboardMetrics() {
  const assessments = getStore().assessments;
  const logs = getStore().logs;
  const total = assessments.length;
  const scores = assessments.map((a) => a.score?.creditScore).filter((v): v is number => typeof v === "number");
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const approved = assessments.filter((a) => a.score?.decision === "Approved").length;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;
  const avgRequested = total ? Math.round(assessments.reduce((a, b) => a + b.requestedAmount, 0) / total) : 0;
  const avgIncome = total ? Math.round(assessments.reduce((a, b) => a + b.monthlyIncome, 0) / total) : 0;
  const highRisk = assessments.filter((a) => a.score?.riskGrade === "High").length;
  const today = new Date().toISOString().slice(0, 10);
  const todaysRequests = logs.filter((l) => l.timestamp.startsWith(today)).length;
  const completed = assessments.filter((a) => a.status === "Completed").length;
  return {
    totalAssessments: total,
    averageCreditScore: avgScore,
    approvalRate,
    approvedCount: approved,
    averageRequestedAmount: avgRequested,
    averageMonthlyIncome: avgIncome,
    highRiskAssessments: highRisk,
    todaysRequests,
    completedCases: completed,
    recentAssessments: listAssessments().slice(0, 8),
  };
}

export function computeScore(
  amount: number,
  income: number,
  tenure: number,
  slik: string,
): CreditScoreResult {
  return scoreFor(amount, income, tenure, slik);
}
