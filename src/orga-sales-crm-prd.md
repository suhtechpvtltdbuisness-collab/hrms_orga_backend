# PRD — Leads, Opportunities & Clients (Sales Workspace, ORGA HRMS)

| | |
|---|---|
| **Product** | ORGA HRMS — Sales Workspace module |
| **Author** | Soumya Sindhu, Product Manager |
| **Status** | Draft v1.0 |
| **Date** | 16 July 2026 |
| **Scope** | Leads, Opportunities, Clients — records, lifecycle, and conversion flows |

---

## 1. Problem Statement

Sales teams at ORGA's B2B clients currently track prospects, active deals, and paying customers in disconnected places — spreadsheets, email threads, and memory. When a prospect becomes a paying customer, someone manually re-enters the same company details into a "clients" list, losing deal history, pricing context, and ownership along the way. This causes double data entry, leads that silently go cold, revenue forecasts that can't be trusted, and no reliable record of *when* and *why* a deal was won or lost.

This PRD defines the three core CRM objects — **Lead**, **Opportunity**, and **Client** — and, most importantly, the **conversion pipeline that moves a record from one to the next automatically**, so a company is entered once and its data travels with it from first contact to renewal.

---

## 2. Goals

1. **Zero re-entry:** 100% of client records created via conversion carry over lead/opportunity data automatically — no field is typed twice.
2. **Trustworthy funnel metrics:** Lead→Opportunity and Opportunity→Client conversion rates are computable from system data alone within 30 days of launch.
3. **No silent drop-offs:** Every open lead and opportunity has an owner and a next-action date; records idle beyond a threshold are surfaced automatically.
4. **Payment-gated client creation:** A Client record is created only on a verified commercial trigger (payment received / contract signed), so the client list is always a true list of paying accounts.
5. **Forecast accuracy:** Weighted pipeline forecast (value × win probability) is within ±15% of actual closed revenue after one full quarter of usage.

## 3. Non-Goals (v1)

- **Marketing automation** (campaign builders, drip sequences, lead capture forms) — separate initiative; v1 only *receives* leads via manual entry, import, and API.
- **Payment collection / gateway integration** — v1 records payment status (manual mark or Finance-module webhook); it does not process payments.
- **Multi-currency** — INR only; pricing, GST, and revenue reporting assume Indian entities.
- **Duplicate-merge tooling** — v1 warns on likely duplicates at creation; a full merge UI is deferred to v1.1.
- **Client success features** (support tickets, NPS, health scoring beyond the basic indicator) — the Client object stores relationship data; deep CS workflows are a future module.

---

## 4. Personas

- **Sales Executive (SE):** creates and works leads, runs deals, sends quotations. Lives in the pipeline daily.
- **Sales Manager (SM):** assigns ownership, approves conversions and discounts, watches forecast and conversion rates.
- **Account Manager (AM):** owns clients post-sale — renewals, upsells, health.
- **Finance/Admin:** confirms payment, triggers or verifies client conversion, needs GST-correct records.

---

## 5. Object Definitions

### 5.1 Lead — *"a person/company that might buy"*

A lead is **pre-qualification**. It is cheap to create and cheap to lose.

**Fields (from approved Add Lead design):** Lead name*, Contact email*, Company, Phone, Source (Website / Referral / LinkedIn / Cold outreach / Event / Partner), Lead owner, Stage, Estimated value (₹), Acquisition cost (₹), Expected close date, Last contact date, Employees, Interested modules, Notes.

**System fields:** Lead ID, AI lead score (0–100), Created by/at, Converted date, Close-lost date, Conversion status (**Not Converted / Converted / Closed Lost**).

**Lead stages:** `New → Contacted → Qualified → (convert) | Lost`

> **Design decision:** In the earlier mock, the lead form allowed stages up to Won/Lost. In v1 the lead's terminal positive stage is **Qualified**, which triggers conversion to an Opportunity. Deal progression (Proposal, Negotiation, Won) happens **on the Opportunity**, not the lead. This keeps funnel metrics unambiguous — a "lead conversion rate" means Lead→Opportunity, and a "win rate" means Opportunity→Closed Won. The status note in the Add Lead modal is preserved: status saves as *Not Converted* until the lead either converts (stores converted date) or is lost (stores close-lost date).

### 5.2 Opportunity — *"a qualified deal we are actively pursuing"*

**Fields:** Company* (linked to lead), Primary contact, Deal value* (₹), Employees, Stage, Expected close date, Owner, Competitor in deal, Modules in scope, Win probability (%), Source lead (link), Linked quotations, Notes/activity timeline.

**Opportunity stages:** `Discovery → Qualified → Proposal → Negotiation → Closed Won | Closed Lost`

Stage changes are the heartbeat of the pipeline: moving to **Proposal** requires a linked quotation; moving to **Closed Won** requires an *accepted* quotation and opens the client-conversion flow (§6.3). Closed Lost requires a loss reason (price / timeline / competitor / no decision / other) — this feeds Reports and Battlecards.

### 5.3 Client — *"a paying account"*

**Fields (from approved Add Client design):** Primary contact*, Company*, Email*, Phone, Monthly revenue (₹), Account manager, Renewal status (On Track / At Risk / Renewal Due / Churned), Contract start, Contract end, Industry, Plan (Growth / Professional / Enterprise), Employees, GSTIN, Billing address.

**System fields:** Client ID, Source opportunity (link), ARR (derived: monthly revenue × 12), Onboarding status, full inherited timeline (every lead/opportunity activity is visible on the client record).

**Client lifecycle:** `Onboarding → Active → (At Risk | Renewal Due) → Renewed | Churned`

---

## 6. The Conversion Pipeline (core of this PRD)

```
  LEAD                    OPPORTUNITY                        CLIENT
┌─────────────┐  qualify ┌──────────────────────┐  payment ┌──────────────┐
│ New          │ ───────▶│ Discovery            │ ───────▶ │ Onboarding   │
│ Contacted    │         │ Qualified            │          │ Active       │
│ Qualified ───┼──convert│ Proposal (quote sent)│          │ At Risk      │
│ Lost ✕       │         │ Negotiation          │          │ Renewal Due  │
└─────────────┘          │ Closed Won ──────────┼─▶ gate:  │ Churned ✕    │
  status:                │ Closed Lost ✕        │  payment │              │
  Not Converted /        └──────────────────────┘  or      └──────────────┘
  Converted /                                      signed
  Closed Lost                                      contract
```

### 6.1 Lead → Opportunity ("Convert lead")

**Trigger:** SE moves lead to **Qualified**, or clicks **Convert to opportunity** on the lead. Qualification checklist (soft gate, configurable): budget indication, decision maker identified, need confirmed.

**What happens:**
1. A conversion modal opens **pre-filled** from the lead (mapping below). SE confirms deal value and stage; nothing is re-typed.
2. Opportunity is created in stage **Discovery** (or Qualified, SE's choice) and appears on the Pipeline board.
3. Lead status flips to **Converted**, converted date is stamped, and the lead becomes read-only with a permanent link to its opportunity.
4. Owner carries over by default; SM can reassign.

**Field mapping (Lead → Opportunity):**

| Lead field | Opportunity field |
|---|---|
| Company | Company |
| Lead name + contact | Primary contact |
| Estimated value | Deal value (editable at conversion) |
| Employees | Employees |
| Interested modules | Modules in scope |
| Expected close date | Expected close date |
| Lead owner | Owner (default) |
| Notes + activity | Timeline (inherited) |
| Source | Attribution (reporting) |

### 6.2 Working the Opportunity

- **Proposal stage** requires at least one linked quotation (draft or sent). The Generate quotation action pre-fills the quotation from opportunity data (company, modules, employees → pricing calculator).
- **Quotation accepted** prompts the SE to move the deal to **Negotiation/Closed Won**; quotation rejected prompts a loss-reason capture or a revised quote.
- **Closed Won** is only selectable when a linked quotation is in **Accepted** state. This is the hard gate that keeps won-revenue numbers honest.

### 6.3 Opportunity → Client ("the payment gate")

**Trigger (either, configurable per workspace):**
- **Payment received** — Finance marks the first invoice paid (manual in v1; Finance-module webhook in v1.1), **or**
- **Contract signed** — a linked contract moves to *Active* with a countersigned copy uploaded.

**What happens:**
1. On Closed Won, the opportunity enters a **Pending activation** state — won, but not yet a client. It shows in a "Won — awaiting payment" list visible to Finance and SM.
2. When the trigger fires, ORGA **auto-creates the Client record** pre-filled from the opportunity + accepted quotation (mapping below) and sets lifecycle to **Onboarding**.
3. Account manager is assigned (defaults to deal owner; SM can hand off to a dedicated AM).
4. The full history — lead source, every stage change, quotations, notes — is attached to the client timeline. **Nothing is re-entered.**
5. If payment is not received within N days (default 30) of Closed Won, the deal is flagged and can be reverted to Negotiation with reason logged.

**Field mapping (Opportunity + Quotation → Client):**

| Source | Client field |
|---|---|
| Opportunity: company, contact, email, phone, employees, industry | Same |
| Accepted quotation: grand total ÷ 12 | Monthly revenue (editable) |
| Accepted quotation: plan/modules | Plan |
| Contract: start / end dates | Contract start / Contract end |
| Deal owner | Account manager (default) |
| — | Renewal status = On Track; Lifecycle = Onboarding |

### 6.4 Reverse & edge flows

- **Reopen a lost lead/opportunity:** allowed with reason; close-lost date history is preserved (a record can lose and win later — both dates are kept for reporting).
- **Client churn:** Renewal status → Churned stamps a churn date; a **Win-back lead** can be spawned in one click, linked to the old client.
- **Direct client creation** (migrating an existing customer book): permitted via Add Client / import; such clients are tagged `source: direct` so conversion-rate metrics exclude them.
- **Duplicate guard:** creating a lead/client whose email domain or company name matches an existing record shows a warning with a link to the existing record.

---

## 7. User Stories (priority order)

**Sales Executive**
- As an SE, I want to convert a qualified lead into an opportunity in one click with all details carried over, so that I never re-type prospect data.
- As an SE, I want the system to stop me from marking a deal Closed Won without an accepted quotation, so that my won numbers survive an audit.
- As an SE, I want to see which of my leads have had no contact in 7+ days, so that nothing goes cold silently.

**Sales Manager**
- As an SM, I want Lead→Opportunity and Opportunity→Won conversion rates by owner and by source, so that I know where the funnel leaks.
- As an SM, I want a "Won — awaiting payment" queue, so that closed deals that never pay are visible instead of hiding in a won column.
- As an SM, I want a loss reason required on every lost deal, so that Battlecards and objection playbooks are fed by real data.

**Account Manager**
- As an AM, I want the full pre-sale history on every client record, so that I never ask a customer something they already told sales.
- As an AM, I want renewal status and contract end dates to drive automatic reminders 60/30/7 days out, so that renewals are never a surprise.

**Finance/Admin**
- As Finance, I want client creation gated on payment/contract, so that the client list equals the billable list.
- As Finance, I want GSTIN and billing address captured at client creation, so that invoicing needs no follow-up emails.

---

## 8. Requirements

### P0 — Must have (v1 cannot ship without)
1. **CRUD for all three objects** with the approved field sets (§5). *AC: all fields save/validate; required fields enforced; records searchable.*
2. **Lead→Opportunity conversion flow** per §6.1. *AC — Given a lead in Qualified, when SE clicks Convert, then an opportunity is created with the §6.1 mapping, the lead becomes read-only with status Converted and a stamped converted date, and the two records link both ways.*
3. **Quotation gate on Closed Won.** *AC — Given no linked quotation in Accepted state, when SE selects Closed Won, then the change is blocked with an explanatory message and a shortcut to the quotation.*
4. **Opportunity→Client auto-conversion on payment/contract trigger** per §6.3. *AC — Given a Closed Won deal, when Finance marks first payment received, then a client record exists with the §6.3 mapping, lifecycle Onboarding, and inherited timeline; no duplicate client is created on repeat triggers (idempotent).*
5. **Lifecycle status stamping.** *AC: converted date, close-lost date, won date, client-activation date, churn date are all system-set and immutable from the UI.*
6. **Ownership & handoff:** every record has exactly one owner; conversion carries owner by default and logs reassignment.
7. **Loss reason capture** on Lead Lost and Opportunity Closed Lost (required field).

### P1 — Should have (fast follow)
8. Idle-record nudges (no activity in N days) surfaced on Overview and via Co-Pilot panel.
9. Duplicate warning at creation (email domain / company-name match).
10. CSV import for leads and clients with field mapping and `source: direct` tagging.
11. Renewal reminders at 60/30/7 days before contract end.
12. Revert flow: Pending-activation deal unpaid after 30 days → flag + optional revert to Negotiation.

### P2 — Future (design for, don't build)
13. Finance-module webhook for automatic payment detection (v1 is a manual Finance action).
14. Duplicate merge UI; multi-currency; marketing lead-capture forms; AI win-probability auto-scoring on opportunities (Co-Pilot suggestion only in v1).

---

## 9. Success Metrics

| Metric | Type | Target (90 days post-launch) |
|---|---|---|
| Conversions using the one-click flow (vs manual client creation) | Leading | ≥ 90% of new clients created via conversion |
| Median time from Closed Won → client activated | Leading | < 5 days |
| Leads with no owner or no next action | Leading | 0 (hard rule) |
| Lead→Opportunity conversion rate computable per source/owner | Leading | Available day 1; baseline established by day 30 |
| Weighted forecast vs actual closed revenue | Lagging | Within ±15% after one quarter |
| Deals stuck in "Won — awaiting payment" > 30 days | Lagging | < 10% of won deals |

Measurement: Sales Reports module; evaluated at 2 weeks, 30 days, and end of first quarter.

## 10. Open Questions

1. **[Product + Finance]** Which is the default client-creation trigger — first payment or signed contract? (Blocking: affects §6.3 default config.)
2. **[Engineering]** Are Lead and Opportunity separate tables or one `deal` table with a `type` flag? Conversion linking and reporting queries depend on this. (Blocking.)
3. **[Product]** Should partial payments activate the client, or only payment-in-full of the first invoice? (Non-blocking; ship with full-payment, make configurable.)
4. **[Design]** Where does the "Won — awaiting payment" queue live — Pipeline board column or Finance-facing list? (Non-blocking.)
5. **[Data]** For migrated `source: direct` clients, do we backfill synthetic opportunities for reporting, or exclude them from funnel metrics entirely? (Non-blocking; propose exclude.)

## 11. Timeline & Phasing

- **Phase 1 (Sprint 1–2):** P0 items 1, 5, 6 — objects, fields, statuses, ownership.
- **Phase 2 (Sprint 3):** P0 items 2, 7 — lead conversion flow + loss reasons.
- **Phase 3 (Sprint 4):** P0 items 3, 4 — quotation gate and payment-gated client creation (depends on Quotations module statuses, already live in the workspace design; and a manual Finance action, no external dependency).
- **Phase 4 (Sprint 5+):** P1 fast-follows in priority order 8→12.

Dependency: contract-signed trigger (§6.3) requires the Contracts module's *Active + signed copy* state — coordinate release order or ship v1 with payment trigger only.
