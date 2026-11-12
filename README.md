# Frontless

**Show up. Not out of pocket.**

A volunteer should not need spare cash to get to a shift. Frontless turns a travel request into a policy-cited, human-approved travel advance, then records what was actually spent.

## Try it

Hosted interactive demo: https://frontless-volunteer-advance.surge.sh/

The hosted static frontend runs **real AI in your browser**. Without a configured same-origin backend, its approval and receipt workflow is explicitly simulated. It does not send a PayPal payout. No API credentials are requested by the static demo.

To run the complete sandbox integration, follow the setup below. The PayPal API code uses the sandbox only; live-money mode is not implemented.

## The flow

1. A volunteer describes a bus/train fare and a confirmed shift.
2. A real sentence-transformer embeds the request and three policy clauses, then shows the closest clause and cosine similarity.
3. Code checks the £15 cap. AI does not decide what to spend.
4. A treasurer verifies the shift, payee, amount, policy and charity budget.
5. The configured Node backend sends a PayPal sandbox Payouts batch with a stable `sender_batch_id`.
6. The treasurer refreshes the payout **item** status. A submitted batch is not proof the volunteer received the advance.
7. A manually entered receipt total is reconciled. £12.00 advanced and £11.20 spent means **£0.80 return outstanding**, not a completed refund or automatic debit.

All people, charity policies and example data are synthetic. There are no claims of pilots, customers or validated willingness to pay.

## Local setup

Requires Node.js 20+ and npm. Tested with Node 22.

```sh
npm ci
npm test
npm run build
npm start
```

Open http://localhost:3000 . In the absence of sandbox credentials, the frontend stays in clearly labelled demo mode. AI downloads its model on the first check, so allow a network connection and a short first-run wait. Later runs use the browser cache. If the model cannot load, the app shows an error rather than a fabricated AI answer.

For the PayPal integration, create a PayPal Developer sandbox REST app and use its sandbox client ID and secret. Fund the **sandbox** Business sender and create/use a sandbox Personal receiver. Make sure the app/account has Payouts access. Availability and permissions depend on the sandbox account configuration.

```sh
cp .env.example .env
# Fill .env locally, never commit it.
# PAYPAL_CLIENT_ID=your sandbox app client ID
# PAYPAL_CLIENT_SECRET=your sandbox app secret
# TREASURER_TOKEN=a long, private access token you choose
npm run build
node --env-file=.env server/index.js
```

- Use the Personal sandbox receiver email instead of `volunteer@example.test`.
- The connected UI asks for `TREASURER_TOKEN` when first making a backend request. It stays in memory only. Never enter a PayPal client secret into that box.
- The prototype uses GBP throughout. Use a sandbox sender/receiver that supports GBP and has the corresponding test balance. Do not switch the UI label without switching the policy currency and checking money limits too.
- Errors may mean missing Payouts permissions or an unfunded sender. A timeout is not proof of a failed transfer. Review the sandbox dashboard before any retry.

## API

The backend serves the built frontend and these routes on the same origin. All data-changing routes and private reads require `X-Treasurer-Token`.

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Sandbox/configuration status and synthetic policy |
| `GET /api/requests` | List requests (treasurer token) |
| `POST /api/requests` | Validate name, email, date, description, £15 limit |
| `POST /api/requests/:id/approve` | Explicit human confirmation, budget check, sandbox payout |
| `GET /api/requests/:id/status` | Fetch latest PayPal payout item status |
| `POST /api/requests/:id/reconcile` | Record actual receipt total after payout status is confirmed |

OAuth credentials are used only on the server against `https://api-m.sandbox.paypal.com`.

## Hosting

- `dist/` can be hosted on any static host for the local-AI/demo workflow.
- `render.yaml` provides a Render Node web-service blueprint. Set the two PayPal sandbox secrets there. The generated treasurer token is private and must not be published.
- Render's free disk is ephemeral. This prototype's JSON request ledger can be lost on a restart/redeploy. Use a durable database, atomic reservation/locking and stronger idempotency recovery before using it for anything beyond synthetic sandbox testing.
- No paid hosting purchase is needed by the code. Check any host's current plan conditions before deploying.

## Architecture / AI

- Vite + plain JavaScript UI
- `@huggingface/transformers` in a dedicated browser worker
- `Xenova/all-MiniLM-L6-v2` quantized ONNX sentence embeddings, mean pooling, L2 normalization and cosine similarity
- Node.js + Express backend; native `fetch` for PayPal OAuth and Payouts
- Integer-penny money arithmetic, human approval, budget cap, stable payout batch IDs, audit events
- No paid AI API, no generative claim of policy extraction, no receipt OCR

The model is semantic retrieval, **not** legal/compliance advice or a reliable payment authorization engine. Its score is not a probability. The treasurer is responsible for the final decision. A caller cannot use an AI result to bypass the server-side amount or budget checks.

## Tests and limits

`npm test` covers money parsing, malformed input, the policy cap, recipient validation and reconciliation. UI checks cover a real browser AI run, the simulated approval flow, manual reconciliation and mobile widths.

Not production-ready: no identity verification, multi-user volunteer authentication, durable shared ledger, rate limiting, receipt validation, return payment flow or autonomous disbursement. A production version needs these, data protection review and charity policy/payment approval.

## Evidence behind the problem

- [NCVO, Time Well Spent 2023](https://www.ncvo.org.uk/news-and-insights/news-index/time-well-spent-2023/volunteering-barriers-enablers/): dated GB research, not a current market-size estimate.
- [Financial help to support volunteering](https://peervols.russellwebster.com/financial-help-to-support-volunteering/): qualitative accounts of up-front cost barriers.
- [PayPal Payouts API](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)
- [Model card and usage](https://huggingface.co/Xenova/all-MiniLM-L6-v2)

## License

MIT. The model and third-party dependencies retain their own licenses. See the model card and npm package notices.

### Authenticated response-simulator smoke test

```sh
node --env-file=.env scripts/smoke-paypal.mjs
```

This sends PayPal's documented `POSPYO001` test value to its sandbox Payouts endpoint using your sandbox app's OAuth credentials. It requests a USD 1.00 **response simulation**, not a real volunteer advance. A 201 test response proves the API interaction, not money movement or receipt by a volunteer. The app's GBP travel workflow is a separate flow. See [PayPal's test-values guide](https://developer.paypal.com/api/payouts/test-go-live).
