import { z } from "zod";
import { createHmac, timingSafeEqual } from "node:crypto";
import { InfraiClient } from "./infra_client.js";

export const onboardingSchema = z.object({ tenantId: z.string().min(1), monthlyCapUsd: z.number().positive(), adminEmail: z.string().email() });
export type Onboarding = z.infer<typeof onboardingSchema>;

export function approveSpend(usedUsd: number, requestedUsd: number, hardCapUsd: number) { return usedUsd + requestedUsd <= hardCapUsd; }

export async function onboardTenant(input: unknown, client: InfraiClient) {
  const tenant = onboardingSchema.parse(input);
  const key = await client.request<{ key_id: string; key_secret: string }>("/v1/account/keys/create", "POST", { project_id: tenant.tenantId, name: `tenant-${tenant.tenantId}`, scopes: ["account", "ai"], idempotency_key: `onboard-${tenant.tenantId}` });
  await client.request("/v1/account/budget/set", "PUT", { hard_cap_usd: tenant.monthlyCapUsd, period: "month", alert_threshold_usd: tenant.monthlyCapUsd * 0.8 });
  return { tenant, keyId: key.key_id, plaintextKey: key.key_secret };
}

export function verifyWebhook(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
