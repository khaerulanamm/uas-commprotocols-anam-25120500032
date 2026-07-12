import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreGauge } from "@/components/score-gauge";
import {
  postAssessment,
  type ApiResponse,
  type AssessmentPayload,
} from "@/lib/scoring-api";
import { getAssessment, getCreditScore } from "@/lib/scoring-api";
import type { Assessment, CreditScoreResult } from "@/lib/scoring-store";

export const Route = createFileRoute("/assessment")({
  component: NewAssessment,
});

const PURPOSES = ["Education", "Business Venture", "Home Renovation", "Consumer Goods"];
const SLIK_OPTIONS = [
  "Kolektibilitas 1",
  "Kolektibilitas 2",
  "Kolektibilitas 3",
  "Kolektibilitas 4",
  "Kolektibilitas 5",
];

type FormState = {
  accountId: string;
  borrowerName: string;
  requestedAmount: string;
  monthlyIncome: string;
  employmentLengthMonths: string;
  purposeOfLoan: string;
  numberOfDependents: string;
  slikStatus: string;
};

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

type SubmitResult = {
  create: ApiResponse<{ assessmentId: string; status: string; createdAt: string }>;
  assessment?: Assessment;
  score?: CreditScoreResult;
};

function NewAssessment() {
  const [form, setForm] = useState<FormState>({
    accountId: "ACC-2026-0042",
    borrowerName: "Anam Setiawan",
    requestedAmount: "10000000",
    monthlyIncome: "15000000",
    employmentLengthMonths: "24",
    purposeOfLoan: "Business Venture",
    numberOfDependents: "2",
    slikStatus: "Kolektibilitas 1",
  });
  const [sendEmptyIncome, setSendEmptyIncome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<AssessmentPayload> = {
        accountId: form.accountId.trim(),
        borrowerName: form.borrowerName.trim(),
        requestedAmount: Number(form.requestedAmount) || 0,
        monthlyIncome: sendEmptyIncome ? undefined : (Number(form.monthlyIncome) || 0),
        employmentLengthMonths: Number(form.employmentLengthMonths) || 0,
        purposeOfLoan: form.purposeOfLoan,
        numberOfDependents: Number(form.numberOfDependents) || 0,
        slikStatus: form.slikStatus,
      };
      const create = await postAssessment(payload);
      if (create.ok && "assessmentId" in (create.data as object)) {
        const id = (create.data as { assessmentId: string }).assessmentId;
        const [a, s] = await Promise.all([getAssessment(id), getCreditScore(id)]);
        const assessment = a.ok ? (a.data as Assessment) : undefined;
        const score = s.ok ? (s.data as unknown as CreditScoreResult) : undefined;
        setResult({ create, assessment, score });
        toast.success(`201 Created · ${id}`);
      } else {
        setResult({ create });
        const errBody = create.data as { error?: { message?: string } };
        toast.error(`HTTP ${create.status} · ${errBody?.error?.message ?? "Request failed"}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Business API · POST /api/assessments
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">New Credit Assessment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a borrower financial profile to the credit scoring engine.
          All amounts are denominated in Indonesian Rupiah (IDR).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Borrower Financial Profile</CardTitle>
            <CardDescription>
              Flat JSON payload with camelCase properties. No nested objects, no metadata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account ID">
                  <Input value={form.accountId} onChange={(e) => set("accountId", e.target.value)} required maxLength={64} />
                </Field>
                <Field label="Borrower Name">
                  <Input value={form.borrowerName} onChange={(e) => set("borrowerName", e.target.value)} required maxLength={120} />
                </Field>
                <Field label="Requested Amount (IDR)" hint={form.requestedAmount ? fmtIDR(Number(form.requestedAmount)) : "—"}>
                  <Input type="number" min={0} value={form.requestedAmount} onChange={(e) => set("requestedAmount", e.target.value)} required />
                </Field>
                <Field label="Monthly Income (IDR)" hint={form.monthlyIncome ? fmtIDR(Number(form.monthlyIncome)) : "—"}>
                  <Input type="number" min={0} value={form.monthlyIncome} onChange={(e) => set("monthlyIncome", e.target.value)} required={!sendEmptyIncome} />
                </Field>
                <Field label="Employment Length (months)">
                  <Input type="number" min={0} value={form.employmentLengthMonths} onChange={(e) => set("employmentLengthMonths", e.target.value)} required />
                </Field>
                <Field label="Number of Dependents">
                  <Input type="number" min={0} value={form.numberOfDependents} onChange={(e) => set("numberOfDependents", e.target.value)} required />
                </Field>
                <Field label="Purpose of Loan">
                  <Select value={form.purposeOfLoan} onValueChange={(v) => set("purposeOfLoan", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="SLIK OJK Status">
                  <Select value={form.slikStatus} onValueChange={(v) => set("slikStatus", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SLIK_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Separator />

              <label className="flex items-start justify-between gap-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Send empty monthlyIncome</span>
                  <span className="block text-xs text-muted-foreground">
                    Local-only override to demonstrate a 400 DATA_CONTRACT_VIOLATION response.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={sendEmptyIncome}
                  onChange={(e) => setSendEmptyIncome(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-warning"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                For global status simulation (401, 404, 429, 500, 503) use the
                Observability Console → Global Status Override.
              </p>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? "Submitting…" : "Submit Assessment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ResultCard result={result} loading={loading} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ResultCard({ result, loading }: { result: SubmitResult | null; loading: boolean }) {
  return (
    <Card className="sticky top-20 gradient-card">
      <CardHeader>
        <CardTitle>Scoring Result</CardTitle>
        <CardDescription>Enterprise scoring summary from the mock API.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !result ? (
          <div className="flex h-72 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scoring…
          </div>
        ) : !result ? (
          <div className="flex h-72 flex-col items-center justify-center text-center text-muted-foreground">
            <div className="mb-3 h-12 w-12 rounded-full border-2 border-dashed border-border" />
            <p className="text-sm">Submit the form to see the credit decision here.</p>
          </div>
        ) : !result.create.ok ? (
          <ErrorState response={result.create} />
        ) : result.assessment && result.score ? (
          <SuccessState assessment={result.assessment} score={result.score} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SuccessState({ assessment, score }: { assessment: Assessment; score: CreditScoreResult }) {
  const approved = score.decision === "Approved";
  const decisionCls = approved
    ? "border-success/40 bg-success/10 text-success"
    : score.decision === "Rejected"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-warning/40 bg-warning/10 text-warning";
  return (
    <div className="space-y-4">
      <ScoreGauge score={score.creditScore} />

      <div className={"rounded-xl border p-4 text-center " + decisionCls}>
        <p className="text-[11px] font-medium uppercase tracking-widest opacity-80">Decision</p>
        <p className="mt-1 font-display text-3xl font-bold uppercase">{score.decision}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Row label="Assessment ID" value={assessment.assessmentId} mono />
        <Row label="Assessment Status" value={assessment.status} />
        <Row label="Risk Grade" value={`${score.riskGrade} Risk`} />
        <Row label="SLIK OJK" value={score.slikStatus} />
        <Row label="Credit Score" value={String(score.creditScore)} mono />
        <Row label="PD" value={`${Math.round(score.probabilityOfDefault * 100)}%`} mono />
        <Row label="Created" value={new Date(assessment.createdAt).toLocaleString("id-ID")} full />
      </div>
    </div>
  );
}

function Row({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={"rounded-lg border border-border/60 p-2.5 " + (full ? "col-span-2" : "")}>
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={"mt-0.5 text-sm font-semibold " + (mono ? "font-mono" : "")}>{value}</p>
    </div>
  );
}

function ErrorState({ response }: { response: ApiResponse<unknown> }) {
  const body = response.data as { error?: { code?: string; message?: string } };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="font-display text-lg font-semibold text-destructive">
            HTTP {response.status} · {body?.error?.code ?? "ERROR"}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{body?.error?.message}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">cid: {response.correlationId}</p>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Response Body</p>
        <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(response.data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
