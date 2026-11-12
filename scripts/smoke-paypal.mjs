/** Authenticated PayPal RESPONSE-SIMULATOR test, not proof of money movement.
 * Official test-value documentation:
 * https://developer.paypal.com/api/payouts/test-go-live
 * node --env-file=.env scripts/smoke-paypal.mjs
 */
import { randomUUID } from "node:crypto";
const base = "https://api-m.sandbox.paypal.com";
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.error("Configure sandbox client ID and secret in .env first.");
  process.exit(1);
}
const auth = Buffer.from(
  process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET,
).toString("base64");
const oauth = await fetch(base + "/v1/oauth2/token", {
  method: "POST",
  headers: {
    Authorization: "Basic " + auth,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
  signal: AbortSignal.timeout(20000),
});
if (!oauth.ok) {
  console.error("Sandbox OAuth failed, HTTP " + oauth.status);
  process.exit(1);
}
const { access_token } = await oauth.json();
const body = {
  sender_batch_header: {
    sender_batch_id: "frontless-test-" + randomUUID(),
    email_subject: "Frontless API response simulation",
  },
  items: [
    {
      recipient_type: "EMAIL",
      receiver: "payouts-simulator-receiver@paypal.com",
      note: "POSPYO001",
      sender_item_id: "frontless-simulator",
      amount: { currency: "USD", value: "1.00" },
    },
  ],
};
const r = await fetch(base + "/v1/payments/payouts", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + access_token,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(20000),
});
const data = await r.json().catch(() => ({}));
console.log(
  JSON.stringify(
    {
      test: "PayPal authenticated response simulator only; not an actual volunteer payout",
      httpStatus: r.status,
      batchId: data.batch_header?.payout_batch_id,
      batchStatus: data.batch_header?.batch_status,
      error: data.name || null,
      source: "https://developer.paypal.com/api/payouts/test-go-live",
    },
    null,
    2,
  ),
);
if (!r.ok) process.exit(1);
