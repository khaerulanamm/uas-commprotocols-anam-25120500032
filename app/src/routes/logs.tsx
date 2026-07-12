import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  Play,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStore,
  type ApiLog,
  type LogSource,
  type StatusOverride,
} from "@/lib/scoring-store";
import {
  clearLogs,
  setSimulation,
  getAssessment,
  getCreditScore,
  getHealth,
  getObservabilityLogs,
  patchAssessmentStatus,
  postAssessment,
} from "@/lib/scoring-api";

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});

const STATUS_OPTIONS: { value: StatusOverride; label: string }[] = [
  { value: "none", label: "None (real responses)" },
  { value: "400", label: "400 · DATA_CONTRACT_VIOLATION" },
  { value: "401", label: "401 · UNAUTHORIZED" },
  { value: "404", label: "404 · RESOURCE_NOT_FOUND" },
  { value: "429", label: "429 · RATE_LIMIT_EXCEEDED (business only)" },
  { value: "500", label: "500 · SYSTEM_FAILURE" },
  { value: "503", label: "503 · SERVICE_UNAVAILABLE" },
];

const SOURCE_OPTIONS: LogSource[] = ["Lovable UI", "Postman", "n8n Webhook"];

function LogsPage() {
  const logs = useStore((s) => s.logs);
  const simulation = useStore((s) => s.simulation);
  const assessments = useStore((s) => s.assessments);
  const [filter, setFilter] = useState("");
  const [targetId, setTargetId] = useState(assessments[0]?.assessmentId ?? "ASM-2026-0001");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.path.toLowerCase().includes(q) ||
        l.method.toLowerCase().includes(q) ||
        String(l.status).includes(q) ||
        l.correlationId.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q),
    );
  }, [logs, filter]);

  async function fire(action: () => Promise<{ status: number; ok: boolean }>) {
    const res = await action();
    (res.ok ? toast.success : toast.error)(`HTTP ${res.status}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Infrastructure & Observability
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">API Logs & Connection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect every REST transaction, simulate HTTP failures, and invoke endpoints
          from a Lovable-native client.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Global Status Override
            </CardTitle>
            <CardDescription>
              Injected into every subsequent API call. 429 only applies to business endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status Override</Label>
                <Select
                  value={simulation.statusOverride}
                  onValueChange={(v) => setSimulation({ statusOverride: v as StatusOverride })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Traffic Source</Label>
                <Select
                  value={simulation.source}
                  onValueChange={(v) => setSimulation({ source: v as LogSource })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: to simulate a rate-limit burst, set the override to 429 and click the
              endpoint buttons rapidly. Every simulated response is logged with its own correlation ID.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" /> Endpoint Playground
            </CardTitle>
            <CardDescription>
              Invoke each documented endpoint. Responses are appended to the audit console below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="gap-1" onClick={() => fire(() => getHealth())}>
                <Play className="h-3.5 w-3.5" /> GET /api/health
              </Button>
              <Button size="sm" variant="secondary" className="gap-1" onClick={() => fire(() => getObservabilityLogs())}>
                <Play className="h-3.5 w-3.5" /> GET /api/observability/logs
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Assessment ID</Label>
              <Input value={targetId} onChange={(e) => setTargetId(e.target.value)} className="font-mono" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => fire(() => getAssessment(targetId))}>
                  <Play className="h-3.5 w-3.5" /> GET /assessments/:id
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => fire(() => getCreditScore(targetId))}>
                  <Play className="h-3.5 w-3.5" /> GET /credit-scores/:id
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => fire(() => patchAssessmentStatus(targetId, "Completed"))}>
                  <RefreshCw className="h-3.5 w-3.5" /> PATCH → Completed
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => fire(() => patchAssessmentStatus(targetId, "Failed"))}>
                  <RefreshCw className="h-3.5 w-3.5" /> PATCH → Failed
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() =>
                fire(() =>
                  postAssessment({
                    accountId: "ACC-DEMO-001",
                    borrowerName: "Demo Borrower",
                    requestedAmount: 15000000,
                    monthlyIncome: 10000000,
                    employmentLengthMonths: 24,
                    purposeOfLoan: "Consumer Goods",
                    numberOfDependents: 1,
                    slikStatus: "Kolektibilitas 1",
                  }),
                )
              }
            >
              <Play className="h-3.5 w-3.5" /> POST /api/assessments (demo payload)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Observability Audit Console</CardTitle>
            <CardDescription>
              Immutable log of every API transaction. Expand a row for headers and bodies.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter path, status, cid…"
                className="h-8 w-56 pl-8 text-xs"
              />
            </div>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => { clearLogs(); setExpanded({}); }}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No log entries.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="grid grid-cols-[24px_80px_1fr_80px_80px_120px_120px] gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span></span>
                <span>Method</span>
                <span>Path</span>
                <span>Status</span>
                <span>Latency</span>
                <span>Source</span>
                <span>Timestamp</span>
              </div>
              <div className="divide-y divide-border/60">
                {filtered.map((l) => (
                  <LogRow
                    key={l.id}
                    log={l}
                    open={!!expanded[l.id]}
                    onToggle={() => setExpanded((s) => ({ ...s, [l.id]: !s[l.id] }))}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LogRow({ log, open, onToggle }: { log: ApiLog; open: boolean; onToggle: () => void }) {
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[24px_80px_1fr_80px_80px_120px_120px] items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="font-mono font-semibold">{log.method}</span>
        <span className="truncate font-mono text-foreground">{log.path}</span>
        <StatusBadge status={log.status} />
        <span className="font-mono text-muted-foreground">{log.latencyMs}ms</span>
        <span className="truncate text-muted-foreground">{log.source}</span>
        <span className="truncate font-mono text-muted-foreground">
          {new Date(log.timestamp).toLocaleTimeString("id-ID")}
        </span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border/60 bg-muted/20 px-3 py-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Request Headers</p>
            <Json value={log.requestHeaders} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response Headers</p>
            <Json value={log.responseHeaders} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Request Body</p>
            <Json value={log.requestBody} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response Body</p>
            <Json value={log.responseBody} />
          </div>
          {log.errorMessage && (
            <div className="sm:col-span-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">Error Message</p>
              <pre className="rounded border border-destructive/40 bg-destructive/10 p-2 font-mono text-[11px] text-destructive">{log.errorMessage}</pre>
            </div>
          )}
          <div className="sm:col-span-2 font-mono text-[10px] text-muted-foreground">
            correlationId: {log.correlationId} · responseType: {log.responseType}
          </div>
        </div>
      )}
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-56 overflow-auto rounded border border-border/60 bg-background p-2 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StatusBadge({ status }: { status: number }) {
  const cls =
    status < 300
      ? "bg-success/15 text-success"
      : status < 400
        ? "bg-primary/15 text-primary"
        : status < 500
          ? "bg-warning/15 text-warning"
          : "bg-destructive/15 text-destructive";
  return (
    <span className={"inline-flex w-fit items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold " + cls}>
      {status}
    </span>
  );
}
