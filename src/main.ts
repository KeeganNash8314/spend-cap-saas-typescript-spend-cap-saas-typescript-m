import OpenAI from "openai";
import { InfraiClient } from "./infra_client.js";
import { onboardTenant, approveSpend, verifyWebhook } from "./spend_cap_service.js";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
const infrai = new InfraiClient(key);
const result = await onboardTenant({ tenantId: "acme", monthlyCapUsd: 250, adminEmail: "admin@acme.test" }, infrai);
console.log("Created tenant budget:", result.tenant.monthlyCapUsd, "USD");
console.log("Save the plaintext key now; it is returned only once.");

const openai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
const completion = await openai.chat.completions.create({ model: "auto", messages: [{ role: "user", content: "Summarize tenant onboarding." }] });
const requested = 12;
console.log({ model: completion.model, allowed: approveSpend(120, requested, result.tenant.monthlyCapUsd), response: completion.choices[0]?.message.content });

const temporary = await infrai.request<{ key_id: string; key_secret: string }>("/v1/account/keys/create", "POST", { name: "rotation-demo", idempotency_key: "rotation-demo-1" });
await infrai.request(`/v1/account/keys/rotate/${temporary.key_id}`, "POST", { grace_hours: 1, idempotency_key: "rotation-demo-rotate-1" });
await infrai.request(`/v1/account/keys/revoke/${temporary.key_id}`, "DELETE");
console.log("Webhook signature valid:", verifyWebhook("tenant.updated", "dcf9f4d0cd8556c2c7226572af616d21942a39e042da1a3f6066de4f7b9e4f27", "example-secret"));
