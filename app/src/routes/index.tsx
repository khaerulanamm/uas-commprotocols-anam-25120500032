import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  FilePlus2,
  Gauge,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/scoring-store";

export const Route = createFileRoute("/")({
  component: DashboardOverview,
});

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function DashboardOverview() {
  // All metrics come from the backend `GET /api/dashboard` endpoint. The
  // client never computes credit scores or approval rates itself.
  const dashboard = useStore((s) => s.dashboard);

  const total = dashboard?.totalAssessments ?? 0;
  const avgScore = dashboard?.averageCreditScore ?? 0;
  const approved = dashboard?.approvedCount ?? 0;
  const approvalRate = dashboard?.approvalRate ?? 0;
  const avgRequested = dashboard?.averageRequestedAmount ?? 0;
  const avgIncome = dashboard?.averageMonthlyIncome ?? 0;
  const highRisk = dashboard?.highRiskAssessments ?? 0;
  const todaysRequests = dashboard?.todaysRequests ?? 0;
  const completed = dashboard?.completedCases ?? 0;

  const stats = [
    { label: "Total Assessments", value: total.toString(), icon: Activity, hint: "All-time submitted" },
    { label: "Average Credit Score", value: avgScore ? avgScore.toString() : "—", icon: Gauge, hint: "Portfolio mean" },
    { label: "Approval Rate", value: `${approvalRate}%`, icon: TrendingUp, hint: `${approved} approved` },
    { label: "Avg. Requested Amount", value: fmtIDR(avgRequested), icon: Banknote, hint: "Per application" },
    { label: "Avg. Monthly Income", value: fmtIDR(avgIncome), icon: Wallet, hint: "Borrower mean" },
    { label: "High Risk Assessments", value: highRisk.toString(), icon: ShieldAlert, hint: "Grade = High" },
    { label: "Today's Requests", value: todaysRequests.toString(), icon: CalendarClock, hint: "API transactions today" },
    { label: "Completed Cases", value: completed.toString(), icon: BadgeCheck, hint: "Lifecycle finalised" },
  ];

  const recent = dashboard?.recentAssessments ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-white shadow-elegant">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">
              Credit Scoring Mock API
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Enterprise Credit Scoring Console
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Perform enterprise credit assessments, evaluate SLIK OJK status,
              simulate REST API communication, and monitor every transaction
              through a centralized observability dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/assessment">
                <FilePlus2 className="h-4 w-4" /> New Assessment
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link to="/logs">
                <Activity className="h-4 w-4" /> Observability
              </Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" aria-hidden />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-semibold">{s.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Assessments</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest 8 completed credit assessments in the ledger.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/logs">
                Audit trail <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 py-12 text-center">
                <p className="text-sm font-medium">No assessments yet</p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/assessment">Start assessment</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recent.map((a) => (
                  <div key={a.assessmentId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {a.assessmentId}
                        </span>
                        <span className="truncate text-sm font-medium">{a.borrowerName}</span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {a.purposeOfLoan}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {a.accountId} · {fmtIDR(a.requestedAmount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.score && (
                        <>
                          <span className="font-mono text-sm">{a.score.creditScore}</span>
                          <RiskBadge grade={a.score.riskGrade} />
                          <DecisionBadge decision={a.score.decision} />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RiskBadge({ grade }: { grade: "Low" | "Medium" | "High" }) {
  const cls =
    grade === "Low"
      ? "bg-success/15 text-success"
      : grade === "Medium"
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";
  return (
    <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + cls}>
      {grade} Risk
    </span>
  );
}
function DecisionBadge({ decision }: { decision: "Approved" | "Rejected" | "Review" }) {
  const cls =
    decision === "Approved"
      ? "bg-success/15 text-success"
      : decision === "Rejected"
        ? "bg-destructive/15 text-destructive"
        : "bg-warning/15 text-warning";
  return (
    <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + cls}>
      {decision}
    </span>
  );
}
