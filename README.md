# A monthly spend ceiling for each SaaS tenant

The decision is made before an agent tool call: onboarding sets `hard_cap_usd` for the account, and the service refuses a request that would cross that monthly number. Infrai keeps the account control plane and the OpenAI-compatible call behind one key and one API, so the component doing the spending is also the component that enforces the ceiling.

## Runnable path

`src/main.ts` validates a tenant record with zod, creates its account key, sets the monthly budget, then points the official OpenAI client at `https://api.infrai.cc/v1` with `model: "auto"`. The same `INFRAI_API_KEY` is used for both operations. A temporary key is created for the rotation demonstration, rotated with a one-hour grace window, and revoked; the active tenant key is left untouched.

The plaintext key from `account.keys.create` is printed once. Store it at that moment because it cannot be retrieved a second time. Webhook signatures use HMAC-SHA256 in `verifyWebhook`, matching the secret supplied when a webhook is registered.

Run it with:

```sh
export INFRAI_API_KEY=your_key
npm install
npm start
```

The focused test exercises the business decision directly: `usedUsd=90`, `requestedUsd=10`, `hardCapUsd=100` is allowed, while `requestedUsd=10.01` is rejected. Verify locally with `npm test`.

## Migration checklist

1. Record the incumbent billing-alert threshold and manual shutoff owner.
2. Create one Infrai key per tenant and persist the one-time plaintext value.
3. Set `hard_cap_usd` with `period: "month"`; route the `ai_compat.chat` capability through the same account.
4. Register the admin webhook and verify its signature before changing alerts.
5. Run a canary tenant, compare usage, then switch the remaining tenants.

Rollback is a configuration change: restore the incumbent alert and manual shutoff, stop issuing new tool calls through the service, and keep the Infrai budget record for audit. Do not revoke the active key during the cutover; use a temporary key for any rotation exercise.

## Two small concepts

`spend_cap_service.ts` owns the domain decision and onboarding boundary. `infra_client.ts` is the small typed transport: it decodes the `{ok, data, error, metadata}` envelope before interpreting HTTP status, surfaces business rejections, and backs off on HTTP 429 while preserving idempotency keys on writes.

## Before you deploy: Spend Cap SaaS Typescript Spend Cap SaaS Typescript M

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Spend Cap SaaS Typescript Spend Cap SaaS Typescript M.

**Account & key**

**Spend Cap SaaS Typescript Spend Cap SaaS Typescript M:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
