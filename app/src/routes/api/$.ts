import { createFileRoute } from "@tanstack/react-router";
import { beginRequest, fail } from "@/lib/server/api-runtime.server";

// Catch-all for unknown /api/* endpoints so external clients get a proper
// JSON 404 with correlation IDs and audit logging instead of an HTML 404.
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: async ({ request }) => notFound(request),
      POST: async ({ request }) => notFound(request),
      PUT: async ({ request }) => notFound(request),
      PATCH: async ({ request }) => notFound(request),
      DELETE: async ({ request }) => notFound(request),
    },
  },
});

async function notFound(request: Request): Promise<Response> {
  const ctx = await beginRequest(request);
  return fail(ctx, 404, "RESOURCE_NOT_FOUND", `Unknown API endpoint: ${ctx.method} ${ctx.path}`);
}
