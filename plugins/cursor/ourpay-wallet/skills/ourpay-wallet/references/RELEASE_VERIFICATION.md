# OurPay Wallet 0.10.0 release verification

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
