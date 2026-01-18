# Billing System Overhaul Plan

## Goal
Replace the existing ad-hoc billing system with a secure, maintainable, and high-performance "Ledger & Policy" architecture.

## 1. Architecture

### 1.1 Entities (New Schema)
We will introduce strictly typed tables for usage tracking to replace the ad-hoc JSONB and slow counts.

1.  **`UsageCache`** (Replaces `organizations.usage` JSONB)
    - `orgId`: text (PK)
    - `metric`: text (PK) - e.g., 'members', 'teams', 'storage_bytes'
    - `count`: integer
    - `lastUpdated`: timestamp

2.  **`UsageLedger`** (Audit Log)
    - `id`: uuid (PK)
    - `orgId`: text
    - `metric`: text
    - `delta`: integer
    - `reason`: text (e.g., 'member_added', 'file_upload', 'monthly_reset')
    - `timestamp`: timestamp

### 1.2 Services
We will create a dedicated domain module `app/services/billing/`.

1.  **`UsageService`**
    - `increment(orgId, metric, amount, reason)`: Atomic DB update to Cache + Ledger.
    - `getUsage(orgId)`: Fast read from Cache.

2.  **`EntitlementService`**
    - `check(orgId, action)`: Returns `{ allowed: boolean, reason?: string }`.
    - Logic: Fetches Plan + Usage, applies Policy.

3.  **`BillingService`**
    - `syncSubscription(dodoData)`: Updates `subscriptions` table.
    - `reportUsage(orgId)`: Batches usage events to Dodo Payments.

## 2. Migration Strategy

To ensure zero downtime and data integrity:

1.  **Phase A: Schema & Services**
    - Create new tables.
    - Implement services.
    - **Add Tests**: Critical, as existing coverage is zero.

2.  **Phase B: Backfill (Double Run)**
    - Create a script `scripts/billing-backfill.ts` that:
        - Iterates all Organizations.
        - Performs the "Old Count" (slow).
        - Writes to `UsageCache` and `UsageLedger` (reason: 'migration').
    - Verify counts match existing data.

3.  **Phase C: Switchover**
    - Update `billing.server.ts` and `zero/billing-enforcement.ts` to call `EntitlementService` instead of ad-hoc logic.

## 3. Implementation Steps

### Step 1: Foundation (Schema & Types)
- Create `app/db/schema/billing-schema.ts`.
- Define Zod schemas for Plans and Limits.

### Step 2: Core Services
- Implement `UsageService` (with atomic increments).
- Implement `EntitlementService` (the policy engine).
- **Test**: Unit tests for both services.

### Step 3: Dodo Integration
- Implement `BillingService`.
- Update Webhook handler to use `BillingService.syncSubscription`.

### Step 4: Backfill & Verification
- Run backfill script.
- Verify data in Drizzle Studio / SQL.

### Step 5: Enforcement Switch
- Refactor `app/lib/billing/billing.server.ts` to use new services.
- Refactor `zero/billing-enforcement.ts` to use new services.

### Step 6: Cleanup
- Remove `organizations.usage` column.
- Remove old counting logic in `usage-counting.server.ts`.

