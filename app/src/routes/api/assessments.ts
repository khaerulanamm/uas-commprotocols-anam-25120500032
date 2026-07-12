import { createFileRoute } from "@tanstack/react-router";
import {
  beginRequest,
  fail,
  finish,
  optionsResponse,
  runSimulations,
} from "@/lib/server/api-runtime.server";
import { createAssessment, listAssessments } from "@/lib/server/store.server";

const ALLOWED_PURPOSES = ["Education", "Business Venture", "Home Renovation", "Consumer Goods"];

function validate(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Payload must be a JSON object.";
  }
  const o = payload as Record<string, unknown>;
  const required = [
    "accountId", "borrowerName", "requestedAmount", "monthlyIncome",
    "employmentLengthMonths", "purposeOfLoan", "numberOfDependents", "slikStatus",
  ];
  for (const k of required) {
    if (o[k] === undefined || o[k] === null || o[k] === "") return `Missing required field: ${k}`;
  }
  for (const k of ["requestedAmount", "monthlyIncome", "employmentLengthMonths", "numberOfDependents"]) {
    if (typeof o[k] !== "number" || Number.isNaN(o[k] as number)) {
      return `Field "${k}" must be a number.`;
    }
  }
  if (!ALLOWED_PURPOSES.includes(String(o.purposeOfLoan))) {
    return `purposeOfLoan must be one of: ${ALLOWED_PURPOSES.join(", ")}`;
  }
  if ("apiVersion" in o) return "Field \"apiVersion\" is not permitted.";
  if ("metadata" in o) return "Field \"metadata\" is not permitted.";
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return `Nested objects are not permitted (field: ${k}).`;
    }
  }
  return null;
}

export const Route = createFileRoute("/api/assessments")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      GET: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: true });
        if (sim) return sim;
        const items = listAssessments();
        return finish(ctx, 200, { count: items.length, items });
      },
      POST: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: true });
        if (sim) return sim;
        const err = validate(ctx.requestBody);
        if (err) return fail(ctx, 400, "DATA_CONTRACT_VIOLATION", err);
        const p = ctx.requestBody as {
          accountId: string; borrowerName: string; requestedAmount: number;
          monthlyIncome: number; employmentLengthMonths: number;
          purposeOfLoan: string; numberOfDependents: number; slikStatus: string;
        };
        const a = createAssessment(p);
        return finish(
          ctx,
          201,
          {
            assessmentId: a.assessmentId,
            status: "Pending",
            createdAt: a.createdAt,
            resource: `/api/assessments/${a.assessmentId}`,
            scoreResource: `/api/credit-scores/${a.assessmentId}`,
          },
          { extraHeaders: { location: `/api/assessments/${a.assessmentId}` } },
        );
      },
    },
  },
});
