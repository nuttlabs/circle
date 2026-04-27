# CIRCLE.md

Authoritative architecture and program reference for **Nutt Labs Circle**. Read this whenever the task touches pricing, payments, customer data, referrals, emails, event processing, or the Airtable base.

---

## Program overview

**Nutt Labs Circle** is William Nutt's annual membership program. One subscription bundles:

- **AI Orchestration** coaching (live + on-demand workshops)
- **Acceleration Resources** (templates, frameworks, skills, agents)
- **Discounted 1:1 coaching** (15% off William's personalized consulting rates)
- **Notion A-to-Z** (premium Notion VIP material, including Bulletproof)

Pricing:

- **Founding Member.** $300/year. Renews free with 2 qualifying paid invites. Current offer.
- **Regular.** $600/year. Renews free with 4 qualifying paid invites. Added at launch.

Referrers earn a **$150 credit** per qualifying invite, capped at their own annual rate. Two founding invites cover a founding renewal; four regular invites cover a regular renewal.

Teams tier routes to `form.nutt.ai/teams`. No Stripe flow yet.

Program constraints:

- Memberships are **non-refundable**.
- Experience is **self-serve by design**. No human support tier. Customer portal and FAQs carry common needs. Members use their discounted 1:1 coaching when they want William's time.
- Launch target: **mid-June 2026**.

---

## Landing page

Source lives in this repo at `/ai-orchestration/`. Hosted URL: `https://circle.nutt.ai/ai`. Legal pages at `/ai-orchestration/privacy.html` and `/ai-orchestration/terms.html`.

**Referral attribution.** `main.js` reads `?inv=<code>` off the URL, persists it in localStorage, and appends `client_reference_id=inv-<code>` to the Stripe payment link CTAs. Every click carries the inviter's code into Stripe Checkout.

**Stripe payment link.** `https://buy.stripe.com/8x25kFegy5X5c1M9AR4c800`

**Customer portal.** `https://billing.stripe.com/p/login/8x25kFegy5X5c1M9AR4c800`

**Outgoing sender.** `circle@nutt.ai`

**Linked form URLs in emails.**

- Workshop topic submission: `form.nutt.ai/ai-topic?email=<recipient email>`
- Notion A-to-Z access request: `form.nutt.ai/az-access`

---

## Terminology

Precise vocabulary used throughout the system. Match these exactly.

- **Object Type.** The class of Stripe object an event is about: Customer, Subscription, Checkout, Invoice. Prices are referenced but not their own ingestion path.
- **Event Type.** The specific Stripe event string (`customer.created`, `checkout.session.completed`, etc.).
- **Ingestion automation.** Receives a Stripe webhook, writes a row to the Events table. One per object type.
- **Handler automation.** Processes an Events row, upserts into the relevant mirror table, sets own status to Handoff. One per object type.
- **Chain Handoff automation.** Single cross-cutting automation. Promotes the oldest Waiting event to Processing and marks the Handoff record Processed.
- **Kickoff automation.** Scheduled. Restarts stalled chains when nothing is in flight.
- **Staleness Notifier.** Scheduled. Alerts when records are stuck past threshold.

---

## Stripe event subscriptions

Seven events, each mapped to a specific job:

- `customer.created`, `customer.updated`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `checkout.session.completed`
- `invoice.paid`

No others. Specifically excluded: `customer.deleted` (not applicable), `billing.credit_balance_transaction.created` (Billing Credits API, not in use), additional invoice events (only paid invoices are tracked).

Separate webhook endpoints in Stripe, one per object type, each pointing at the matching ingestion automation's webhook URL.

---

## Airtable base

Name: **Nutt Labs Circle**. Base ID: `app4jaR1PGS9swouH`.

### Mirror tables

Each mirrors a Stripe object type, keyed on the Stripe ID.

**Customers** (`tblTZp07U3MY1OM3Y`). Primary: `ID` = `cus_…`. Holds Full Name, Email, Business Name, Country, Postal Code, Balance (Cents), Balance formula, Eligible for Credit formula (`IF(Balance * -1 < Price Amount, "Yes", "No")`), Invitation Code formula (`SUBSTITUTE(LOWER(Full Name), " ", "") & Autonumber`), Invitation Link formula (`"https://circle.nutt.ai/ai?inv=" & Invitation Code`). Links to Subscriptions, Checkouts, Invoices, Email Instances.

**Subscriptions** (`tblPKYzcP1MdPYgVb`). Primary: `ID` = `sub_…`. Status (singleSelect: `active`, `past_due`, `unpaid`, `canceled`). Current Period Start/End Timestamp (unix) + formula datetimes. Links to Customer, Price, Checkouts, Invoices.

**Checkouts** (`tblGcoxS0SZdcOUiE`). Primary: `ID` = `cs_…`. Created Timestamp, Total Amount (Cents) + formula, `client_reference_id`, Invitation Code formula (extracts from `client_reference_id`), Inviter (Manual Entry), Promo Code (singleSelect), Inviter Credit Status (`Processing`, `Applied`, `Limit Reached`). Links to Customer, Subscription, Email Instances.

**Invoices** (new). Primary: `ID` = `in_…`. Status, Billing Reason, Amount Paid (Cents), Invoice Created/Period Start/Period End Timestamps, Hosted Invoice URL, Invoice PDF URL, Invoice Number, Attempt Count. Links to Customer, Subscription. Only paid invoices tracked (subscription to `invoice.paid` only).

**Prices** (`tblipeQzm1IQLunYx`). Primary: `ID` = `price_…`. Amount, Nickname. Maintained manually; subscription handler stub-creates if missing.

### Events table

The queue that buffers incoming webhooks for serial processing.

**Universal fields (populated on every event):**

- `Event ID` (primary, `evt_…`)
- `Event Type` (singleSelect, all seven subscribed types)
- `Object ID` (`body.data.object.id`)
- `Status` (singleSelect: `Waiting`, `Processing`, `Handoff`, `Processed`, `Failed`)
- `Processing Started Time` (datetime, stamped when chain handoff or kickoff sets status to Processing)
- `Is Stalled` (formula: `AND(OR({Status}="Processing", {Status}="Handoff"), IS_BEFORE({Processing Started Time}, DATEADD(NOW(), -5, "minutes")))`)

**Referenced ID fields (sparse, populated when present in payload):**

- `Referenced Customer ID` ← `body.data.object.customer`
- `Referenced Subscription ID` ← `body.data.object.subscription`
- `Referenced Price ID` ← `body.data.object.items.data[0].price.id`
- `Referenced Invoice ID` ← `body.data.object.invoice` (checkout events only; optional field — only needed if direct Checkout ↔ Invoice links become valuable)

No Referenced Checkout ID: nothing in the object graph references Checkouts.

**Per-object-type data fields (sparse, populated by the matching ingestion automation):**

*Customer events.* Full Name, Email, Country, Postal Code, Business Name, Balance (Cents).

*Subscription events.* Subscription Status, Current Period Start Timestamp, Current Period End Timestamp.

*Checkout events.* Total Amount Cents, `client_reference_id`, Created Timestamp.

*Invoice events.* Billing Reason, Amount Paid Cents, Amount Due Cents, Invoice Created Timestamp, Period Start Timestamp, Period End Timestamp, Due Date Timestamp, Hosted Invoice URL, Invoice PDF URL, Invoice Number, Attempt Count, Invoice Status.

No `Payload` field. Airtable's chip picker doesn't allow selecting the top-level `body` object, and per-field extraction covers every need. Raw payloads remain viewable via Stripe Dashboard (Developers → Events → click `evt_…`).

### Email tables

**Email Templates** (`tblRyj8FouuESNdIJ`). Template Label, Subject, Markdown, HTML (aiText generated from Markdown, inline-styled body-only for Gmail integration). Existing templates: `Welcome`, `Accepted Invitation`.

**Email Instances** (`tblDIITEZIcAfOmDg`). Per-send record. Rollups resolve merge tokens from linked Recipient (Customer), Invitee (Customer), Checkout. Template dropdown, Status, Subject lookup.

---

## Integration architecture

**Design principle: minimize custom code and external infrastructure.** Airtable hosts the entire admin backend. No Make, Zapier, or n8n middleware. No Cloudflare Workers or other external endpoints.

**Stripe → Airtable.** Each object type has its own Stripe webhook endpoint, subscribed to a disjoint subset of events, pointing at its own Airtable ingestion automation. Separate endpoints exist because Airtable's webhook-trigger chip picker validates paths against one sample payload at a time, and a single ingestion can't hold chips for multiple payload shapes.

**Airtable → Stripe.** Only through Airtable automation scripts, only when unavoidable. Current necessary exception: writing to Stripe's `customer_balance_transactions` endpoint when a referral credit is granted. Everything else uses Airtable's visual automation actions.

**Emails.** Airtable Automation → Gmail "Send email" action. Fires on Email Instance creation. Renders the instance's resolved HTML and Subject and sends from `circle@nutt.ai`.

---

## Event processing lifecycle

### Status machine

```
Waiting → Processing → Handoff → Processed
                                    ↘ Failed (side exit from any state)
```

- **Waiting.** Ingestion wrote the row. Not yet claimed by a handler.
- **Processing.** A handler is actively working on it.
- **Handoff.** Handler finished. Chain Handoff hasn't finalized yet.
- **Processed.** Complete.
- **Failed.** Handler error, or stale record flipped by manual intervention after the Staleness Notifier flagged it.

### Automations

**Ingestion (×4, one per object type).** Trigger: webhook received. Writes one Event record with Status = Waiting, plucks all applicable fields from the payload. No branches, no logic. Each ingestion handles a homogeneous payload shape; chip picker stays stable.

**Handler (×4, one per object type).** Trigger: `Status = Processing AND Event Type matches`. Actions: find-or-create on referenced records (Customer, Subscription, Price as relevant), upsert the own-object-type record, link fields. Invoice handler additionally runs the credit branch on `invoice.paid` with matching Billing Reason. Final action: set own Status = Handoff.

**Chain Handoff.** Trigger: `Status = Handoff`. Actions: (1) Find oldest Waiting record, set Status = Processing (fires its Handler). Stamp `Processing Started Time`. (2) Set the Handoff record's Status = Processed. Order matters — promote before marking Processed so the "chain in flight" invariant holds.

**Kickoff.** Scheduled, every 1-2 minutes. Checks if any record has Status = Processing or Handoff. If none, finds oldest Waiting and promotes to Processing (stamps `Processing Started Time`). Restarts chains after a stall; idle otherwise.

**Staleness Notifier.** Scheduled, every 5 minutes. Find records where `Is Stalled = 1`. If any, sends William an email digest listing the stuck records.

### Invariant

At every moment during a running chain, at least one record has Status = Processing or Handoff. The Kickoff's idle check exits whenever either exists. The Chain Handoff preserves this by promoting the next Waiting record before marking its triggering record Processed.

### Idempotency

Each ingestion's first action: Find records in Events where `Event ID = body.id`. If found, halt — Stripe retried an already-captured event. Prevents duplicate rows.

Each handler's find-or-create on mirror tables is idempotent: repeat runs update rather than duplicate. The credit branch additionally checks the Checkout's `Inviter Credit Status` — if already `Applied`, skip. Triple-layer protection against double-credit scenarios.

---

## Referral credit flow

1. Visitor arrives at `circle.nutt.ai/ai?inv=<code>`. `main.js` persists the code to localStorage and appends it to Stripe CTAs.
2. Visitor clicks CTA, Stripe Payment Link loads with `client_reference_id=inv-<code>`.
3. Stripe fires the relevant events. Checkout ingestion writes the Checkout Event row. Checkout handler creates the Checkout record, parses `Invitation Code` from `client_reference_id`.
4. Invoice handler (on `invoice.paid` with `billing_reason` = `subscription_create` or `subscription_cycle`) looks up the Checkout's Invitation Code, finds the inviter Customer, checks `Eligible for Credit`.
5. **Eligible.** Script action posts to `POST /v1/customers/<inviter_cus_id>/balance_transactions` with `amount: -15000`, `currency: "usd"`. Updates `Balance (Cents)` locally. Sets Checkout's `Inviter Credit Status` = `Applied`. Creates an Email Instance with the `Accepted Invitation` template.
6. **Cap reached.** Sets Checkout's `Inviter Credit Status` = `Limit Reached`. TBD whether to send a variant email.

**Credit mechanism.** Classic Stripe **Customer invoice balance**, not Billing Credits. Post-tax application to the next invoice, no expiration, simple running balance. Appropriate for this program's flat pricing and non-expiring credits.

**Manual override.** Checkouts table has `Inviter (Manual Entry)` text field for cases where automatic matching fails.

---

## Testing

**Stripe Sandbox** is the development environment (replaces the old test-mode toggle). Each sandbox is isolated with its own API keys, webhooks, Prices, and data.

Standard setup:

1. Create sandbox (`circle-dev`).
2. Create a test Price mirroring Founding Member ($300/year).
3. Create a test Payment Link against that Price.
4. Register ingestion webhook URLs as webhook endpoints in the sandbox, with the matching event subscriptions per endpoint.
5. Generate events by performing dashboard actions (create customer, add subscription) or by using the test Payment Link with card `4242 4242 4242 4242`.
6. For renewal testing, attach a Test Clock to a test subscription and advance one billing period.
7. Event replay (Developers → Events → Resend) is the workhorse for iterating on handler logic without rebuilding state.

The Dashboard's "Send test event" button now directs users to the Stripe CLI, which is not used here. Real events generated through UI actions or replay cover all testing needs.

---

## Editorial conventions

- **Never use em dashes (`—`) in new copy.** William considers them the most common "AI tell." Use periods, commas, semicolons, or parentheses. Exception: leave William's own em dashes alone if he writes them.
- **Preserve William's voice.** Distinctive words like "amassing" and "notables" are intentional. Don't sand them into generic marketing copy.
- **Keep fine-print sections subtle but not overlooked.** The three notables above the CTA (start-date expectation, no human support, no refunds) are deliberate. Keep them above the button.

---

## Outstanding / TBD

- **$600 Regular price.** Not yet created in Stripe. Added at launch.
- **Teams tier.** No Stripe flow. Form-only funnel for now.
- **Email templates.** `Welcome` and `Accepted Invitation` exist. Likely additions: renewal notice, failed-payment (`past_due` / `unpaid`), canceled, cap-reached variant, founding-cohort updates.
- **Customer portal UX & FAQs.** Referenced in fine print. Scope TBD.
- **Real Stripe coupons.** `Nutt-4` in the Promo Code singleSelect is a placeholder. Real coupons created per promotion, added as Promo Code options as needed.
- **`Referenced Invoice ID` field.** Optional. Add if a direct Checkout ↔ Invoice link becomes valuable. Not needed for current flows.
