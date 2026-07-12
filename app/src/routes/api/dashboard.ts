import { createFileRoute } from "@tanstack/react-router";
import { beginRequest, finish, optionsResponse, runSimulations } from "@/lib/server/api-runtime.server";
import { dashboardMetrics } from "@/lib/server/store.server";

export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      GET: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: false });
        if (sim) return sim;
        return finish(ctx, 200, dashboardMetrics());
      },
    },
  },
});
