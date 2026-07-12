import { createFileRoute } from "@tanstack/react-router";
import {
  beginRequest,
  fail,
  finish,
  optionsResponse,
  runSimulations,
} from "@/lib/server/api-runtime.server";
import { findAssessment } from "@/lib/server/store.server";

export const Route = createFileRoute("/api/credit-scores/$assessmentId")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      GET: async ({ request, params }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: true });
        if (sim) return sim;
        const a = findAssessment(params.assessmentId);
        if (!a || !a.score) {
          return fail(ctx, 404, "RESOURCE_NOT_FOUND", `Credit score for ${params.assessmentId} not found.`);
        }
        return finish(ctx, 200, {
          assessmentId: a.assessmentId,
          accountId: a.accountId,
          borrowerName: a.borrowerName,
          assessmentStatus: a.status,
          assessmentTimestamp: a.updatedAt,
          ...a.score,
        });
      },
    },
  },
});
