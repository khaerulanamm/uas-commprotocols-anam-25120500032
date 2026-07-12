import { createFileRoute } from "@tanstack/react-router";
import {
  beginRequest,
  fail,
  finish,
  optionsResponse,
  runSimulations,
} from "@/lib/server/api-runtime.server";
import {
  getSimulation,
  setSimulation,
  type LogSource,
  type StatusOverride,
} from "@/lib/server/store.server";

const OVERRIDES: StatusOverride[] = ["none", "400", "401", "404", "429", "500", "503"];
const SOURCES: LogSource[] = ["Lovable UI", "Postman", "n8n Webhook", "curl", "Webhook", "Unknown"];

export const Route = createFileRoute("/api/simulation")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(await beginRequest(request)),
      GET: async ({ request }) => {
        const ctx = await beginRequest(request);
        const sim = runSimulations(ctx, { isBusiness: false });
        if (sim) return sim;
        return finish(ctx, 200, getSimulation());
      },
      PUT: async ({ request }) => {
        const ctx = await beginRequest(request);
        // Do not run simulations against the simulation control endpoint itself,
        // otherwise a "500" override would lock the operator out of clearing it.
        const body = (ctx.requestBody ?? {}) as { statusOverride?: string; source?: string };
        if (body.statusOverride && !OVERRIDES.includes(body.statusOverride as StatusOverride)) {
          return fail(ctx, 400, "DATA_CONTRACT_VIOLATION", `statusOverride must be one of: ${OVERRIDES.join(", ")}`);
        }
        if (body.source && !SOURCES.includes(body.source as LogSource)) {
          return fail(ctx, 400, "DATA_CONTRACT_VIOLATION", `source must be one of: ${SOURCES.join(", ")}`);
        }
        return finish(ctx, 200, setSimulation({
          statusOverride: body.statusOverride as StatusOverride | undefined,
          source: body.source as LogSource | undefined,
        }));
      },
    },
  },
});
