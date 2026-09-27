# OurPay Wallet release verification

## 0.11.0 — live payment verification, September 27, 2026

The release adds bounded recurring checkout consent, approval/authorization transaction tracking, automatic purchase reconciliation, actionable status text and an early payment-submission email. The original pending Ethereum purchase settled with its original transaction; no replacement charge was sent.

| Live test | Observed result |
| --- | --- |
| One-time $1 Ethereum checkout | Exact 1.000107-USDC invoice paid; one canonical order and one benefit grant; a completed retry returned the same order and transaction |
| Subscription $1 Polygon checkout | Exact 1-USDC first charge, canonical order and active subscription; finite monthly mandate with a two-payment maximum |
| Test cleanup | Subscription canceled immediately; executor cancellation transaction confirmed and on-chain mandate recorded canceled |
| Funding | Gasless Arbitrum routes delivered 7.804359854165330341 POL from 1 USDC and 1.965615 Polygon USDC from 2 USDC; source/destination settlement verified |
| Fees | Both $1 orders recorded the configured Starter fee of $0.55; treasury collection accounting does not create fiat withdrawal credit |
| Early email | Provider accepted the Ethereum submission notice 16.2 seconds after broadcast and the subscription notice 1.6 seconds after broadcast |
| Final notifications | Buyer/merchant notifications accepted within about two seconds of each canonical order; cancellation email accepted about 1.4 seconds after cancellation |

Ethereum's finalized block lagged the successful receipt. The final receipt therefore followed settlement roughly 16 minutes after broadcast, while the early notice explained that processing was ongoing. Provider acceptance is not proof of inbox arrival. The connected mailbox differed from the receipt recipients, so inbox delivery was not independently verified.

The merchant's external subscription webhook returned HTTP 530 / Cloudflare origin DNS error. Retries remain queued; downstream webhook fulfillment is not a passing result. The one-time product's OurPay benefit grant did complete. Monthly renewal was tested on isolated Anvil chains in the previous release, not by waiting a month or accelerating a production billing period.

Live tests also exposed a Polygon RPC timeout and a provider log-range rejection. The existing subscription RPC was switched to the configured wallet provider without changing deployment identity, keys or limits. Authorization discovery now reads at most 100 finalized blocks per page; failed reads preserve the cursor. Known transaction hashes continue through direct receipt verification.

### Checks and publication

- Targeted purchase/subscription/approval suite: 31 passed; email-renderer test: 1 passed; readiness and scan recovery: 8 passed. Sets overlap with earlier broader runs.
- SDK: 38 passed, 4 optional groups skipped; wallet approval UI: 7 passed. Relevant lint/typechecks, client generation and production wallet build passed.
- [Release v0.11.0](https://github.com/Ourpay/ourpay-wallet/releases/tag/v0.11.0): seven GitHub archives and wallet-site copies matched checksums. Source CI `36330767426` and tag CI `36330866598` passed.
- Both MCP services and the wallet frontend were deployed. The catalog remains 57 tools; the existing purchase tools accept the new recurring terms.
- This report is updated after acceptance tests. Previously published version archives remain immutable. The registry was still advertising 0.10.0 at the last check; its hosted endpoint serves the updated runtime.

## Historical 0.10.0 verification

Recorded September 27, 2026. This report separates deployed functionality, automated coverage and observed production behavior.

## Delivered

- One elected public Hyperliquid feed per network, shared across wallets through Redis. Filtered/coalesced updates carry freshness and reset information. Private balances, orders and fills are not shared.
- Bounded persistent trading plans on the existing scheduler/worker: fixed-size IOC attempts, optional price conditions, budgets, attempt limits, pause/stop and reconciliation. These are fixed plans, not a hosted discretionary AI trader.
- Native perpetual stop-loss and take-profit market/limit orders. Independent exits are not an atomic OCO bracket; triggered does not mean filled.
- Polygon native-USDC recurring merchant payments using finite on-chain mandates. The production mandate limit is currently two payments; renewals require valid authorization, allowance, balance and executor readiness.
- Immutable collection fee snapshots and accounting. USD PayPal/USDC follows the merchant plan; INR is 5% with no fixed fee for every plan at present. Direct-to-seller INR transfers record an amount owed to OurPay rather than automatically deducting cash. PayPal retains its existing ledger deduction; treasury USDC records the retained fee and seller net.
- Updated architecture, design, deployment, integration and operator documentation; 57 tools and refreshed v0.10.0 packages.

## Release locations

- Wallet: https://wallet.ourpay.dev/wallet
- Canonical MCP: https://mcp.ourpay.dev/wallet/mcp
- Release: https://github.com/Ourpay/ourpay-wallet/releases/tag/v0.10.0
- Registry: https://registry.modelcontextprotocol.io/v0.1/servers/io.github.Ourpay%2Fourpay-wallet/versions/latest
- Tag CI: https://github.com/Ourpay/ourpay-wallet/actions/runs/36314670959
- Source CI: https://github.com/Ourpay/ourpay-wallet/actions/runs/36314669397

The registry record was read back as active/latest. This does not represent approval by every vendor directory. Seven GitHub archives and their wallet-site copies matched the released checksum manifest.

## Runtime deployment evidence

| Surface | Commit/version | Confirmed live UTC |
| --- | --- | --- |
| Render API | `785f2f3f06b270e670328990464b2e5128099fca` | 11:16:43 |
| Render worker | `785f2f3f06b270e670328990464b2e5128099fca` | 11:15:58 |
| Render scheduler | `785f2f3f06b270e670328990464b2e5128099fca` | 11:15:17 |
| Canonical MCP | `57a002067d5a396348b850dce8b57b84481041d4` | 10:59:19 |
| Legacy wallet MCP | `57a002067d5a396348b850dce8b57b84481041d4` | 10:59:14 |
| Cloudflare wallet | `a576b484-96f1-44a0-9e8f-fba2de88c57a` | Deployment and live UI checked |

The additive migration was deployed first. Later commits did not change the MCP runtime. No new paid hosting service was created.

Authenticated ChatGPT tool discovery showed 23 write and 34 read tools after refresh/reload. Hosted market search passed for both networks after the final catalog fix. The wallet showed live shared-feed prices on mainnet and testnet; testnet search displayed non-BTC spot pairs without the earlier catalog error. New runner-list and updates routes returned successful authenticated responses. No live trading plan was started.

Two API errors at 11:17:43 were correlated with SIGTERM/shutdown of the replaced instance; the replacement instance continued serving feed, order, account and runner reads. They were not treated as successful requests or silently counted as zero balances.

## Automated checks and limits

See [TESTING.md](TESTING.md) for the detailed matrix: 240 backend tests passed with 6 skipped, a later targeted set of 42 passed, 41 local crypto-subscription tests passed, 15 Solidity tests passed, SDK 37 passed with 4 optional groups skipped, canonical MCP 20 passed, and wallet proxy 4 passed. Targeted sets overlap; these numbers are not a combined unique-test count. Four framework clients loaded all 57 tools. Relevant lint, typechecks and production builds passed.

The local subscription suite moves tokens on isolated Anvil chains. Venue fixtures verify native trigger wire data, limits, approvals, idempotency and reconciliation, but are not real Hyperliquid trigger fills. Production subscription readiness was checked at Polygon block 94533675 without charging a customer.

The snapshot benchmark used ten identical hosted calls in each window: median 1,447 ms before and 1,079 ms after; p95 1,831 ms before and 1,842 ms after, with no call errors. This is full snapshot response latency, not source-to-agent streaming delay or order-to-fill latency. The latter measurements remain unverified. See [TESTING.md](TESTING.md) for method and scope.

No new user-fund movements, signatures, wallet permission changes or approval emails were performed during this release verification. Fresh venue-native trigger execution/cancellation and a new production USDC renewal remain separate funded acceptance tests. Local success cannot guarantee mainnet liquidity, fees, fills or profitability.
