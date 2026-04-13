# S1-04: Stripe Webhook Lifecycle — Verification Steps

## Automated Tests

Run from the repo root:

```bash
pnpm turbo test --filter=@repo/api
```

Test file: `packages/api/modules/payments/__tests__/stripe-webhook.test.ts`

### Test Coverage

| Suite | Tests | What it covers |
|-------|-------|---------------|
| StripeEventLog dedup | 4 | New event returns false, duplicate (P2002) returns true, unexpected errors re-throw, same ID delivered twice is idempotent |
| subscription.created | 5 | Purchase creation with correct fields, Member row creation, no duplicate Member, Circle provisioning trigger, Layer 3 skip when circleMemberId exists |
| subscription.deleted | 3 | Purchase.status flipped to "canceled" (NOT deleted), Circle deactivation, skip when no circleMemberId |
| subscription.updated | 4 | Purchase.status update, Circle reactivation on canceled->active, no reactivation on other transitions, no reactivation when circleStatus != "deactivated" |
| User deletion cascade | 2 | Circle member deletion for all memberships, skip when no circleMemberId |
| Checkout metadata | 2 | Both userId and organizationId present, null when organizationId missing |

## Manual Verification with Stripe CLI

### Prerequisites
- Stripe CLI installed and authenticated
- Local dev server running (`pnpm dev`)
- `.env.local` has `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### 1. Test subscription.created

```bash
# Forward Stripe events to local webhook
stripe listen --forward-to localhost:3000/api/webhooks/payments

# In another terminal, trigger a checkout
stripe trigger checkout.session.completed --add checkout_session:metadata[user_id]=test_user --add checkout_session:metadata[organization_id]=test_org
```

Verify:
- [ ] Purchase row created with `type: SUBSCRIPTION`, `status: active`
- [ ] Member row created linking user to organization
- [ ] StripeEventLog row created with the event ID
- [ ] Circle provisioning placeholder logged (check server logs)

### 2. Test duplicate delivery (idempotency)

```bash
# Resend the same event
stripe events resend <event_id_from_step_1>
```

Verify:
- [ ] No new Purchase or Member rows created
- [ ] Response is `200 { received: true }`
- [ ] No Circle provisioning re-triggered

### 3. Test subscription.deleted

```bash
stripe trigger customer.subscription.deleted
```

Verify:
- [ ] Purchase.status updated to "canceled"
- [ ] Purchase row still exists (NOT deleted)
- [ ] Circle deactivation placeholder logged

### 4. Test subscription.updated (reactivation)

Manually update a subscription from canceled to active in the Stripe Dashboard, or:

```bash
stripe trigger customer.subscription.updated
```

Verify:
- [ ] Purchase.status updated to match subscription status
- [ ] If previous_attributes.status was "canceled" and new status is "active", Circle reactivation logged

### 5. Test user deletion cascade

Trigger user deletion through the app UI (Settings > Delete Account).

Verify:
- [ ] Stripe subscriptions canceled
- [ ] Circle member deletion placeholder logged for each membership
- [ ] Member rows cascade-deleted by Prisma (onDelete: Cascade)

## Type Check

```bash
pnpm turbo type-check --filter=@repo/payments --filter=@repo/auth --filter=@repo/api
```

All three packages must pass with zero errors.
