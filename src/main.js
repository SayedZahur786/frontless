import "./style.css";
import { POLICY, minor, reconcile } from "../server/domain.js";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => "£" + (n / 100).toFixed(2);
let state = {
  view: "volunteer",
  step: 1,
  amount: "12.00",
  name: "Alex Morgan",
  email: "volunteer@example.test",
  shift: "2026-11-14",
  description:
    "I need a return bus ticket to get to my volunteer shift at the community kitchen. The fare is £12.",
  ai: null,
  request: null,
  backend: false,
  busy: false,
  message: "",
  receipt: "11.20",
};
let adminToken = "";
let worker;
let timer;
const icon = (n) =>
  ({
    leaf: "↗",
    volunteer: "◉",
    treasurer: "▦",
    policy: "≡",
    check: "✓",
    arrow: "→",
    receipt: "▤",
    shield: "◇",
  })[n] || n;
function shell() {
  $("#app").innerHTML =
    `<aside class="sidebar"><a href="#" class="brand"><span class="brandmark">f.</span>frontless<span class="brand-dot">●</span></a><p class="side-eyebrow">THE VOLUNTEER EXPENSE DESK</p><nav>${[
      ["volunteer", "Volunteer desk", "Request travel support"],
      ["treasurer", "Treasurer desk", "Review, approve & reconcile"],
      ["policy", "Expense policy", "The rules behind each decision"],
    ]
      .map(
        ([k, t, d]) =>
          `<button class="nav-item ${state.view === k ? "active" : ""}" data-view="${k}"><span class="nav-icon">${icon(k)}</span><span>${t}<small>${d}</small></span></button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><span class="demo-pill">SANDBOX PROTOTYPE</span><p>No live money. No real volunteer data.<br>People always approve payments.</p><button class="text-button" id="reset">Reset demo ↺</button></div></aside><main><header class="topbar"><span>Greenbridge <b>Community Kitchen</b><span class="fictional">Fictional charity</span></span><span class="connection"><i class="${state.backend ? "online" : ""}"></i>${state.backend ? "Sandbox backend connected" : "Interactive demo mode"}</span></header><div id="content"></div><footer><span>Built for people who show up.</span><span>Frontless · PayPal AI Hackathon 2026</span></footer></main><div class="toast ${state.message ? "show" : ""}" role="status">${esc(state.message)}</div>`;
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        state.view = b.dataset.view;
        render();
      }),
  );
  $("#reset").onclick = () => {
    state.request = null;
    state.ai = null;
    state.step = 1;
    state.view = "volunteer";
    state.message = "Demo reset. No money moved.";
    render();
  };
}
function heading(k, title, desc) {
  return `<div class="eyebrow">${k}</div><h1>${title}</h1><p class="lead">${desc}</p>`;
}
function render() {
  shell();
  $("#content").innerHTML =
    state.view === "volunteer"
      ? volunteer()
      : state.view === "treasurer"
        ? treasurer()
        : policy();
  bind();
}
function volunteer() {
  return `${heading("01 / VOLUNTEER DESK", "Show up.<br><em>Not out of pocket.</em>", "Your time is a gift. Paying to get there should not be a barrier. Request your travel money before your shift.")}<div class="steps">${["Request", "Policy check", "Approval", "Travel & reconcile"].map((x, i) => `<span class="${i + 1 <= state.step ? "current" : ""}"><b>${i + 1}</b>${x}</span>`).join("")}</div><div class="workspace"><section class="panel request-panel"><div class="panel-heading"><span class="number">01</span><div><h2>Your next shift</h2><p>A small request. One less thing to worry about.</p></div><span class="tag">TRAVEL ADVANCE</span></div><form id="request-form"><div class="field-grid"><label>Your name<input id="name" maxlength="100" required value="${esc(state.name)}"></label><label>Shift date<input type="date" id="shift" required value="${esc(state.shift)}"></label></div><label>What do you need?<textarea id="description" rows="3" minlength="8" maxlength="2000" required>${esc(state.description)}</textarea></label><div class="field-grid"><label>Estimated fare<span class="amount-input"><span>£</span><input id="amount" type="number" min="0.01" max="15" step="0.01" required value="${esc(state.amount)}"></span><small>Up to £15 per confirmed shift</small></label><label>Sandbox PayPal email<input id="email" type="email" required value="${esc(state.email)}"><small>Synthetic example. Not a real payee.</small></label></div><button class="primary wide" ${state.busy ? "disabled" : ""} type="submit">${state.busy ? '<span class="spinner"></span> Analysing...' : "Check against the policy <span>→</span>"}</button><p class="privacy-note">◇ AI matches your words to policy. It never approves a payment.</p></form></section><aside class="info-column"><div class="impact-card"><span class="sun">✳</span><h3>Support before<br>the bus leaves.</h3><p>Reimbursement helps later.<br>An advance helps you get there.</p><div class="impact-line"></div><div class="facts"><span>Travel budget<b>£200.00</b></span><span>Advance limit<b>£15.00 / shift</b></span></div></div><div class="quiet-card"><span>HOW IT WORKS</span><ol><li>Tell us about your travel.</li><li>AI finds the relevant policy clause.</li><li>A treasurer checks and approves.</li><li>Record the receipt after your shift.</li></ol></div></aside></div>${state.ai ? aiPanel() : ""}${state.request ? `<div class="callout success"><b>Request ${state.request.id.slice(0, 8)} is ${esc(state.request.state.replaceAll("_", " ").toLowerCase())}.</b><span>${state.backend ? "Stored on the connected sandbox server." : "Stored only in this page for the demo. No payment has been sent."}</span><button class="secondary" id="to-treasurer">Open treasurer desk →</button></div>` : ""}`;
}
function aiPanel() {
  const top = state.ai.scored[0];
  const allowed =
    top.id === "T1" &&
    top.score >= 0.35 &&
    top.score - state.ai.scored[1].score >= 0.05;
  return `<section class="panel ai-panel"><div class="panel-heading"><span class="ai-spark">✧</span><div><h2>Policy match, with the evidence</h2><p>Real local AI · all-MiniLM-L6-v2 · no API key</p></div><span class="tag ${allowed ? "green" : ""}">${allowed ? "TRAVEL CLAUSE MATCH" : "HUMAN REVIEW NEEDED"}</span></div><div class="ai-columns"><div><span class="eyebrow">CLOSEST POLICY CLAUSE</span><h3>${esc(top.id)} · ${esc(top.label)}</h3><blockquote>${esc(top.text)}</blockquote><small>Cosine similarity ${top.score.toFixed(3)}. Similarity is not certainty or approval.</small></div><div class="decision"><b>${allowed ? "Looks like eligible travel." : "This may need a separate decision."}</b><p>${allowed ? "The request matches public transport. The £15 cap is checked with code, not a language model. A treasurer must still confirm the shift, recipient and amount." : "The closest clause is not the standard travel allowance. AI can be wrong. Do not send an advance without checking the policy and getting separate coordinator approval."}</p><button id="queue-request" class="primary" ${!allowed || state.request ? "disabled" : ""}>${state.request ? "Sent for review ✓" : "Send to treasurer →"}</button></div></div><details><summary>Inspect all policy matches</summary>${state.ai.scored.map((x) => `<p class="score-row"><span>${esc(x.id)} · ${esc(x.label)}</span><code>${x.score.toFixed(3)}</code></p>`).join("")}</details></section>`;
}
function treasurer() {
  const r = state.request;
  return `${heading("02 / TREASURER DESK", "Trust people.<br><em>Check the details.</em>", "AI finds the policy. You decide whether the request is right, then approve a sandbox advance.")}<div class="metrics"><div><span>Travel budget</span><b>£200.00</b><small>Fictional demo allocation</small></div><div><span>Advance requested</span><b>${r ? money(r.amountMinor) : "£0.00"}</b><small>${r ? "1 volunteer request" : "No request yet"}</small></div><div><span>Payment environment</span><b class="metric-word">Sandbox only</b><small>${state.backend ? "Connected Node backend" : "No API credentials configured here"}</small></div></div>${!r ? `<section class="panel empty"><span>◉</span><h2>A little support starts here.</h2><p>Complete a volunteer request and run the AI policy check to see it in your review queue.</p><button class="primary" id="to-volunteer">Create a travel request →</button></section>` : `<section class="panel review-panel"><div class="panel-heading"><span class="avatar">AM</span><div><h2>${esc(r.name)}</h2><p>${esc(r.shift)} · Community kitchen shift</p></div><span class="status">${esc(r.state.replaceAll("_", " "))}</span></div><div class="review-grid"><div><span class="eyebrow">TRAVEL REQUEST</span><p class="request-quote">"${esc(r.description)}"</p><dl><dt>Recipient</dt><dd>${esc(r.email)}</dd><dt>Amount</dt><dd><b>${money(r.amountMinor)} GBP</b></dd><dt>Policy</dt><dd>${POLICY.id} · £15 limit</dd></dl><div class="mini-evidence"><b>✧ AI evidence: T1 · Public transport</b><p>${esc(POLICY.clauses[0].text)}</p></div></div><div class="approval-box"><h3>${r.state === "AWAITING_APPROVAL" ? "Your approval is the safeguard." : "Advance activity"}</h3>${r.state === "AWAITING_APPROVAL" ? `<p>Confirm this is a real, confirmed shift; the recipient and amount are correct; and the charity has available funds.</p><label class="checkbox"><input id="confirmed" type="checkbox">I checked the shift, payee, policy and budget.</label><button class="primary wide" id="approve" ${state.busy ? "disabled" : ""}>${state.backend ? "Approve & send sandbox payout" : "Simulate treasurer approval"} →</button><p class="tiny">${state.backend ? "Sends a real PayPal sandbox API request. No live money." : "Demo simulation only. It does not contact PayPal or move money."}</p>` : `<div class="payment-state"><span>✓</span><b>${r.state === "DEMO_APPROVED" ? "Simulated advance approved" : esc(r.state.replaceAll("_", " "))}</b><p>${state.backend ? "Payout API submission is not proof of receipt. Refresh item status." : "A demo transition, not a PayPal response."}</p></div>${r.batchId ? `<code class="batch">Batch: ${esc(r.batchId)}</code><button class="secondary wide" id="refresh-status">Refresh PayPal item status</button>` : ""}`}</div></div></section>${r.state !== "AWAITING_APPROVAL" ? receiptPanel() : ""}<section class="panel audit-panel"><h2>Every step, accounted for.</h2><ul class="audit">${(r.audit || []).map((x) => `<li><i></i><span>${esc(x.event.replaceAll("_", " "))}<small>${esc(new Date(x.at).toLocaleTimeString())}</small></span></li>`).join("")}</ul></section>`}<div class="callout"><b>Designed for an advance, not a loan.</b><span>No interest. No automatic debit. A remaining balance is a ledger item for a treasurer to follow up, never a silent charge.</span></div>`;
}
function receiptPanel() {
  const rec = state.request.reconciliation;
  return `<section class="panel"><div class="panel-heading"><span class="number">04</span><div><h2>Back from the shift?</h2><p>Record the actual receipt total and close the loop.</p></div></div><div class="reconcile-grid"><div><label>Receipt total (£)<input id="receipt" type="number" step="0.01" min="0" value="${esc(state.receipt)}"></label><button class="secondary wide" id="reconcile">Record receipt total →</button><small>Manual entry for this prototype. No receipt OCR is claimed.</small></div><div class="reconcile-result">${rec ? `<span class="eyebrow">RECONCILIATION</span><b>${rec.extraMinor ? money(rec.extraMinor) + " extra needs review" : rec.unspentMinor ? money(rec.unspentMinor) + " unspent" : "All accounted for"}</b><p>Advanced ${money(state.request.amountMinor)} · Spent ${money(rec.actualMinor)}</p><span class="tag">${esc(rec.state.replaceAll("_", " "))}</span><p class="tiny">${rec.unspentMinor ? "Return is outstanding. No refund or automatic debit has occurred." : rec.extraMinor ? "Additional reimbursement needs separate approval." : "Receipt total matches the advance."}</p>` : `<span class="receipt-icon">▤</span><p>£12.00 advance → £11.20 receipt<br>£0.80 return outstanding.</p>`}</div></div></section>`;
}
function policy() {
  return `${heading("03 / EXPENSE POLICY", "Clear rules.<br><em>No awkward guessing.</em>", "A fictional policy for a real working prototype. Every AI match points back to a clause a person can read.")}<div class="policy-banner"><span class="tag">${POLICY.id}</span><span>GBP · £15 per shift · £200 demo budget</span></div>${POLICY.clauses.map((c) => `<section class="panel policy-clause"><span class="clause-id">${c.id}</span><div><h2>${esc(c.label)}</h2><p>${esc(c.text)}</p></div></section>`).join("")}<section class="panel"><h2>What this prototype does, and does not do</h2><div class="boundary-grid"><div><h3>Built into this demo</h3><ul><li>Real browser-based AI semantic policy matching</li><li>Deterministic money limits and receipt arithmetic</li><li>Human approval and an activity trail</li><li>Node backend for sandbox PayPal Payouts</li></ul></div><div><h3>Not production-ready</h3><ul><li>No real charities, pilots or demand claims</li><li>No identity checks, multi-user login or receipt OCR</li><li>No real-money payout or automatic collection</li><li>Demo mode is not proof of a PayPal transaction</li></ul></div></div></section><section class="panel"><h2>Backend connection</h2><p>${state.backend ? "A same-origin Node backend is available. Enter a treasurer access token when prompted to create or approve a request." : "This hosted site runs locally in your browser. Run the included Node server with PayPal sandbox credentials to connect real sandbox payouts. Never enter API client secrets into this frontend."}</p><button class="secondary" id="check-backend">Check backend availability</button></section>`;
}
function notify(message) {
  state.message = message;
  render();
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.message = "";
    $(".toast")?.classList.remove("show");
  }, 8000);
}
function collect() {
  for (const k of ["name", "email", "shift", "description", "amount"])
    state[k] = $("#" + k).value;
}
async function api(route, method = "GET", body) {
  if (!adminToken) {
    adminToken =
      prompt(
        "Enter the TREASURER_TOKEN configured on your own sandbox server. This is held in memory only. Never enter a PayPal client secret here.",
      ) || "";
  }
  if (!adminToken) throw Error("Treasurer access token is required.");
  const r = await fetch("/api" + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Treasurer-Token": adminToken,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Server request failed.");
  return data;
}
async function checkBackend() {
  try {
    const r = await fetch("/api/health", { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    state.backend = d.service === "frontless" && d.paypalConfigured === true;
  } catch {
    state.backend = false;
  }
}
function bind() {
  $("#request-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    collect();
    try {
      if (minor(state.amount) > 1500)
        throw Error("The policy cap is £15 per shift.");
    } catch (e) {
      notify(e.message);
      return;
    }
    state.busy = true;
    state.ai = null;
    state.request = null;
    render();
    worker ||= new Worker(new URL("./ai.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        const b = $("#request-form .primary");
        if (b)
          b.innerHTML = `<span class="spinner"></span> ${esc(data.message)}`;
      } else if (data.type === "error") {
        state.busy = false;
        notify(data.message);
        console.error(data.detail);
      } else {
        state.busy = false;
        state.ai = data;
        state.step = 2;
        render();
        $(".ai-panel").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    worker.onerror = () => {
      state.busy = false;
      notify("AI worker could not start. Check browser support and retry.");
    };
    worker.postMessage({
      text: state.description,
      clauses: POLICY.clauses.slice(0, 3),
    });
  });
  $("#queue-request")?.addEventListener("click", async () => {
    try {
      state.request = state.backend
        ? await api("/requests", "POST", {
            name: state.name,
            email: state.email,
            shift: state.shift,
            description: state.description,
            amount: state.amount,
          })
        : {
            id: crypto.randomUUID(),
            name: state.name,
            email: state.email,
            shift: state.shift,
            description: state.description,
            amountMinor: minor(state.amount),
            state: "AWAITING_APPROVAL",
            audit: [
              { event: "DEMO_REQUEST_CREATED", at: new Date().toISOString() },
            ],
          };
      state.step = 3;
      notify("Request ready for treasurer review.");
    } catch (e) {
      notify(e.message);
    }
  });
  $("#to-treasurer")?.addEventListener("click", () => {
    state.view = "treasurer";
    render();
    window.scrollTo(0, 0);
  });
  $("#to-volunteer")?.addEventListener("click", () => {
    state.view = "volunteer";
    render();
  });
  $("#approve")?.addEventListener("click", async () => {
    if (!$("#confirmed").checked) {
      notify("Confirm the shift, payee, policy and budget first.");
      return;
    }
    state.busy = true;
    try {
      if (state.backend)
        state.request = await api(
          "/requests/" + state.request.id + "/approve",
          "POST",
          { confirmed: true },
        );
      else {
        state.request.state = "DEMO_APPROVED";
        state.request.audit.push({
          event: "DEMO_APPROVAL_SIMULATED_NO_PAYMENT",
          at: new Date().toISOString(),
        });
      }
      state.step = 4;
      state.busy = false;
      notify(
        state.backend
          ? "Sandbox payout submitted. Refresh its item status."
          : "Demo approval simulated. No PayPal transaction occurred.",
      );
    } catch (e) {
      state.busy = false;
      notify(e.message);
    }
  });
  $("#refresh-status")?.addEventListener("click", async () => {
    try {
      state.request = await api("/requests/" + state.request.id + "/status");
      notify("Latest PayPal item status loaded.");
    } catch (e) {
      notify(e.message);
    }
  });
  $("#reconcile")?.addEventListener("click", async () => {
    state.receipt = $("#receipt").value;
    try {
      if (state.backend)
        state.request = await api(
          "/requests/" + state.request.id + "/reconcile",
          "POST",
          { amount: state.receipt },
        );
      else {
        state.request.reconciliation = reconcile(
          state.request.amountMinor,
          state.receipt,
        );
        state.request.audit.push({
          event: "DEMO_RECEIPT_RECORDED",
          at: new Date().toISOString(),
        });
      }
      notify("Receipt total recorded. Any return remains outstanding.");
    } catch (e) {
      notify(e.message);
    }
  });
  $("#check-backend")?.addEventListener("click", async () => {
    await checkBackend();
    notify(
      state.backend
        ? "Sandbox backend is configured."
        : "No configured PayPal backend found. Demo mode remains active.",
    );
  });
}
render();
checkBackend().then(render);
