import { createFileRoute } from "@tanstack/react-router";
import {
  beginRequest,
  fail,
  finish,
  optionsResponse,
  runSimulations,
} from "@/lib/server/api-runtime.server";
import { updateAssessmentStatus, type AssessmentStatus } from "@/lib/server/store.server";

const ALLOWED: AssessmentStatus[] = ["Pending", "Scored", "Completed", "Failed"];

export const Route = createFileRoute("/api/assessments/$assessmentId/status")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      PATCH: async ({ request, params }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: true });
        if (sim) return sim;
        const body = (ctx.requestBody ?? {}) as { status?: string };
        if (!body.status || !ALLOWED.includes(body.status as AssessmentStatus)) {
          return fail(
            ctx, 400, "DATA_CONTRACT_VIOLATION",
            `Field "status" must be one of: ${ALLOWED.join(", ")}`,
          );
        }
        const a = updateAssessmentStatus(params.assessmentId, body.status as AssessmentStatus);
        if (!a) return fail(ctx, 404, "RESOURCE_NOT_FOUND", `Assessment ${params.assessmentId} not found.`);
        return finish(ctx, 200, a);
      },
    },
  },
});
