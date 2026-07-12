# n8n — CreditCore Mock API workflow

## Import

1. n8n → **Workflows** → **Import from File** →
   `n8n/CreditScoreHub_Workflow.json`
2. Open the **Config (API_BASE_URL)** node.
   - It reads `API_BASE_URL` from your n8n environment.
   - When n8n runs in Docker on the same host as the API, use
     `http://host.docker.internal:8080` (the default fallback).
   - Change it **only in this node** — all other nodes reference it.
3. **Activate** the workflow.

## Trigger

```bash
curl -sS -X POST "$N8N_URL/webhook/creditcore-intake" \
  -H "content-type: application/json" \
  -d '{
    "accountId":"ACC-2026-0042",
    "borrowerName":"Anam Setiawan",
    "requestedAmount":10000000,
    "monthlyIncome":15000000,
    "employmentLengthMonths":24,
    "purposeOfLoan":"Business Venture",
    "numberOfDependents":2,
    "slikStatus":"Kolektibilitas 1"
  }' | jq
```

The workflow:

1. Receives the borrower payload on the webhook.
2. Reads `API_BASE_URL` from the Config node.
3. Calls `POST /api/assessments` with `x-client-type: n8n Webhook` so the
   observability console tags the request as originating from n8n.
4. Calls `GET /api/credit-scores/{{ assessmentId }}` with the ID returned
   from step 3.
5. Responds to the webhook caller with the merged assessment + score.

## Observability

Every hop appears in `GET /api/observability/logs` with:

- `source: "n8n Webhook"`
- the same `correlationId` propagated from n8n to CreditCore.
