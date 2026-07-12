import { createFileRoute } from "@tanstack/react-router";
import { beginRequest, finish, optionsResponse, runSimulations } from "@/lib/server/api-runtime.server";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      GET: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: false });
        if (sim) return sim;
        return finish(ctx, 200, {
          status: "UP",
          service: "credit-scoring-engine",
          version: "1.0.0",
          uptimeSince: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        });
      },
    },
  },
});
