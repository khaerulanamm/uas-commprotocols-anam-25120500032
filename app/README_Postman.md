# Postman — CreditCore Mock API

## Import

1. Postman → **Import** →
   - `postman/CreditScoreHub.postman_collection.json`
   - `postman/CreditScoreHub.postman_environment.json`
2. Select the **CreditCore (Local)** environment (top-right dropdown).
3. Confirm `baseUrl` matches your running API (`.env` → `API_BASE_URL`,
   default `http://localhost:8080`).

## Suggested run order

1. **Infrastructure → Health** — confirms the API is reachable.
2. **Business API → Create Assessment** — the test script automatically
   copies `data.assessmentId` from the response into the `assessmentId`
   environment variable.
3. **Business API → Get Assessment by ID**
4. **Business API → Get Credit Score**
5. **Business API → Patch Assessment Status → Completed**
6. **Infrastructure → Observability — Logs** — verify every previous
   request is present with the same `correlationId` chain.

## Simulating failures

- Fire **Infrastructure → Simulation — Trigger 500** once. Every subsequent
  Business API call returns `500 SYSTEM_FAILURE` until you fire
  **Simulation — Reset**.
- To hit `429 RATE_LIMIT_EXCEEDED` without touching the toggle, right-click
  **Create Assessment** → *Run collection* with 20 iterations, 0 ms delay.

## Correlation IDs

Every Business request injects `x-correlation-id: {{$guid}}` so you can trace
one Postman call → server route → observability log → any downstream n8n
webhook. The server echoes both `X-Request-Id` and `X-Correlation-Id` on
every response.
