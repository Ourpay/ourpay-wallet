# Shared market data and continuous trading

OurPay Wallet 0.10.0 exposes 57 MCP tools. Five cover shared data and persistent plans: `ourpay_wallet_exchange_updates`, `ourpay_wallet_create_runner`, `ourpay_wallet_runners`, `ourpay_wallet_runner`, and `ourpay_wallet_control_runner`. Existing order tools also accept native perpetual stop-loss/take-profit triggers.

## One public feed, many wallets

The API maintains one elected Hyperliquid WebSocket consumer per environment (mainnet/testnet), shared across server replicas. Public perpetual contexts and spot midpoints enter Redis. Publication is coalesced to at most one update per market per second. An agent selects 1–50 exact market IDs, receives the latest values, then supplies the returned cursor with `wait_seconds` up to 25. Each request returns once. The TypeScript SDK's `watchExchange(network, markets, signal)` async generator follows this protocol from a running client. Abort is checked between calls; an in-flight read can take up to the 30-second request timeout.

A row includes mark/mid price, funding, open interest, volume and 24-hour change where supplied. Null means unavailable. `received_at_ms` is OurPay's receive time; the aggregate venue feed has no source timestamp, so `source_time_ms` is null. These are market observations, not executable quotes. The response identifies missing markets and prices more than 15 seconds old. Private balances, positions, fees, orders, fills and OAuth tokens never enter this shared feed.

`reset=true` means replace local state for the selected markets before continuing. Redis retains a short replay window, not an indefinite tick history. Slow consumers receive coalesced latest values; intermediate ticks can be skipped. Full books, candles and trades remain available through `exchange_market_data` and a shared public REST cache. The wallet uses the same OurPay feed for live prices, and refreshes candle/book snapshots every 30 seconds.

A connected ChatGPT/Claude chat does not automatically wake or acquire a new context message. A running SDK consumer can deliver selected updates to its model. A server plan can continue previously submitted decisions without the model or browser remaining open. OurPay does not start a paid inference loop implicitly.

## Native stop-loss and take-profit orders

Use `ourpay_wallet_place_order` or the batch tool with the normal market, side, size, leverage, margin mode, idempotency key and price boundary, plus:

```json
{
  "order_type": "market",
  "trigger": {"kind": "sl", "price": "55000"},
  "limit_price": "54725",
  "side": "sell",
  "reduce_only": true
}
```

This fragment illustrates a sell stop for an existing long position; it is not a complete executable order. Fetch the actual position and live market precision first. `kind` is `sl` or `tp`. `order_type` selects market IOC or limit execution after triggering. Market-trigger bounds must face the correct side of the trigger and satisfy slippage policy. Spot triggers and post-only trigger orders are rejected. A stop below current mark closes a long; a stop above mark closes a short. Take-profit thresholds point the other way. Already-crossed thresholds are rejected at preflight.

Triggers are registered at Hyperliquid, so the chat closing does not disable them. `reduce_only=true` prevents an exit increasing/flipping exposure. Independent TP/SL orders are **not an atomic OCO bracket**: reconcile fills and cancel the remaining sibling. Triggered does not imply filled. A triggered limit can rest; a market IOC can fill partially or not at all. Margin, liquidation, fees, trigger/limit precision and venue availability still apply. `expires_at` requests OurPay cancellation; it is not a venue-guaranteed deadline. Cancellation may race a fill.

## Persistent plans

For a user-requested ongoing task, submit a plan with:

- Exact environment/market, buy or sell, fixed human-unit size, leverage/margin mode and optional reduce-only.
- An interval from 60 seconds to 24 hours; the existing scheduler checks due work once a minute.
- A condition: `always`, price strictly `above`, or strictly `below` a threshold.
- Maximum attempts and a lifetime USD reference-notional budget; optional expiry.
- A slippage bound. Each qualifying attempt produces a price-bounded IOC order.

The runner uses a fresh shared price and current market constraints. It persists an attempt and stable order UUID before enqueueing work. That UUID is reused after a retry/restart. A new attempt waits for the previous one to reach a known terminal state; uncertain execution pauses the plan. There is no catch-up burst after downtime. It is a fixed plan, not a hosted AI model choosing new strategies, automatic repricing, a loss cap or high-frequency trading.

Reference notional reserves size × the highest observed/limit/mark price × collateral USD value when the intent is formed. Attempt reservations are not refunded after failures or exits. They are distinct from collateral, profit/loss, future funding, and actual execution value after prices move. The wallet's current daily policy and the original connection's permissions are checked again when an order is accepted.

Standard mode requires owner approval for every order. An approval request is bound to its exact action and short price-validity window; expiry pauses the plan. Only owner-enabled Risky mode skips per-action confirmation. Creating a plan never raises the owner's limits or grants new permissions.

Use `runner`/`runners` to inspect status, attempts, next check, errors and last order ID, then read the order and venue fills. `active` means scheduled, not filled or even currently executing. Owners and the original agent can pause/stop. Only the original connection can resume after reconciliation. Stopped/completed/expired plans cannot be resumed; a separately authorized new plan needs a new UUID. Wallet pause, revoked access or expiry prevent further attempts and request cancellation of outstanding work. Existing positions remain open.

## Recurring merchant payments are separate

A trading plan is not a subscription mandate. Eligible fixed-price USD merchant subscriptions can be paid in native USDC using an explicitly authorized on-chain mandate. The deployed contract bounds the recipient, per-period charge, interval, payment count and expiry; the backend uses canonical subscription cycles and receipt-confirmed fulfillment. Failed balance/allowance checks do not grant access or skip missed periods with a catch-up burst.

The live deployment checked on 2026-09-27 is Polygon native USDC, with a configured maximum of two payments per mandate. Additional chains need separately verified deployments. One-time support on a chain does not imply subscription support. Metered, seat-based, trial and changing-price crypto subscriptions are not enabled by this release. Expired/exhausted mandates require renewed authorization. See [contract operations](https://github.com/Ourpay/ourpay/tree/codex/wallet-gasless-funding/contracts) and the merchant fee documentation.

## Verification and limits

Local fixtures test order wiring, permissions, replay, stale data, approvals and failures. Local EVM chains test actual contract authorization, token settlement, renewal and cancellation. Read-only production probes verify deployment readiness and shared-feed/API latency. These do not replace funded venue tests of native trigger fills, mainnet renewals, or measurement of model-decision-to-fill latency. See [TESTING.md](TESTING.md); do not infer profit or mainnet execution guarantees from a passing testnet/local test.
