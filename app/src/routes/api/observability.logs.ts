import { createFileRoute } from "@tanstack/react-router";
import {
  beginRequest,
  finish,
  optionsResponse,
  runSimulations,
} from "@/lib/server/api-runtime.server";
import { clearLogs, listLogs } from "@/lib/server/store.server";

export const Route = createFileRoute("/api/observability/logs")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      GET: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: false });
        if (sim) return sim;
        const logs = listLogs();
        return finish(ctx, 200, { count: logs.length, logs });
      },
      DELETE: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: false });
        if (sim) return sim;
        clearLogs();
        return finish(ctx, 200, { cleared: true });
      },
    },
  },
});
