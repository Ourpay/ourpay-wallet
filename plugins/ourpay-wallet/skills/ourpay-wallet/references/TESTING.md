# Testing and verification

A passing fixture or testnet flow establishes only the behavior exercised in that environment. Mainnet adds different liquidity, gas prices, token contracts, venue balances, minimum sizes, provider availability and merchant configuration. Report tested behavior and remaining uncertainty separately.

## SDK, documentation and packages

From the SDK source directory in the application repository, with Node 24+:

```sh
npm ci
npm run typecheck
npm run docs:check
npm test
npm run verify:frameworks
npm run bundle:public
```

`docs:check` compares [TOOLS.md](TOOLS.md) against the real MCP catalog generated in memory. `docs:tools` regenerates it. No wallet calls, real credentials, signatures or transfers are needed to discover schemas.

`npm test` builds the complete distribution and runs packaging, client, retry, schema, model-result and provider tests using local fixtures. It launches all generated local profiles, including paths containing spaces, and checks private connection reuse and disabled-tool handling. Passing a launch/configuration test does not certify every version of a third-party host UI.

`verify:frameworks` uses pinned Python dependencies to load the tools through OpenAI Agents SDK, LangChain/LangGraph, PydanticAI and Google ADK. It invokes no paid model and moves no funds. `OURPAY_OPENCODE_BIN` optionally selects an installed OpenCode executable for an isolated native connection check.

The public repository includes SDK source and a TypeScript build check. The application repository owns the full SDK/backend/UI test suites; source-only public CI is not a substitute for them.

## Opt-in real-service SDK checks

Start the local API, standalone remote MCP test server and wallet frontend before enabling their test URLs:

```sh
OURPAY_WALLET_TEST_API_URL=http://127.0.0.1:8014 \
OURPAY_WALLET_TEST_MCP_URL=http://127.0.0.1:8024/mcp \
OURPAY_WALLET_TEST_WEB_URL=http://127.0.0.1:3014 npm test
```

Without these variables, real-service groups can skip. They cover HTTP concurrency, connection persistence through process restart, remote PKCE/revocation and browser-session cookie/CSRF/account flows. Inspect the actual test output; skipped is not passed.

`OURPAY_WALLET_TEST_NETWORK_BALANCES=1` additionally reads configured token and native balances with live RPC endpoints. `scripts/verify-browser-connector.mjs` is a local callback helper for a deliberate browser-consent test. Use a test account and supported local environment; running these commands is not permission to enroll or alter an unrelated production wallet.

## Backend and UI coverage

The application repository's `server/tests/agent_wallet/` includes database/policy tests and disposable Anvil EVM networks. These tests exercise signed transactions, simulated routers, fee sponsorship, bridge destination verification and canonical merchant-order creation. LI.FI/Relay/merchant/venue HTTP fixtures do not establish current production liquidity or provider behavior.

Solana tests use LiteSVM for native/SPL transfers, swaps, retained additional signatures, lookup tables, authority-change rejection, pause/retry behavior and recent-blockhash expiry. Simulated bridge messaging is distinct from a funded production bridge settlement.

Hyperliquid tests exercise OurPay signing, durable IDs/nonces, owner policies, venue response handling, fills, cancellation and concurrent-order behavior against an exchange emulator. Non-BTC test cases cover XRP, a builder-deployed perpetual and a non-USDC spot quote; they are not real venue fills.

Wallet UI tests cover loading/error states, grouped activity, recovery/reauthentication dialogs and the trade experience. Shared MCP route tests verify authentication gating and registration of the wallet tools under `/wallet/mcp`, separately from merchant tools under `/mcp`.

Use the per-area `AGENTS.md` in the application repository for backend/UI commands. Python commands there run through `uv run`; broad tests can require Docker, development config and the email-renderer build.

## Dated 0.9.6 verification snapshot

The following records describe the September 27, 2026 release audit and the subsequent canonical-MCP correction. They are historical results, not claims that every current environment has just been retested.

| Area | Recorded result | Boundary |
| --- | --- | --- |
| Backend wallet coverage | 313 passing cases across the core and added non-BTC runs | Local database/chains and provider/venue fixtures; not 313 live trades |
| SDK | 36 passed, 4 optional groups skipped | The skipped real-service groups were not proved by this run |
| Wallet UI | 50 targeted tests passed | Component tests; does not prove every browser/device interaction |
| Shared MCP route | 20 tests passed after correcting the canonical service deployment | Includes 52-tool registration and a guide call with no wallet API reads |
| Framework loading | Four framework clients loaded all 52 tools | No live model inference or trade |
| Live reads | Hyperliquid catalog, account/fees and selected non-BTC market data checked | Read success does not establish order execution or cancellation |
| Release packaging | Seven archives and published checksums checked | Prior tagged archives remain fixed even when repository docs improve |
| Canonical transport | Correct shared-service commit deployed; public health/metadata and unauthenticated rejection checked | A fresh authenticated production `tools/list` was not obtained in that audit; the connected host must verify its catalog |

The correction matters: the first deployment updated the legacy wallet MCP service but not the canonical shared service. The later shared-service deployment and tests fixed that omission. Do not use a legacy deployment or a `/healthz` response as proof that a new canonical tool is visible to an authenticated host.

No real funds, new mainnet orders, changed wallet permissions or recovery phrase reads were needed for that audit. Earlier separate funded tests do not automatically cover later code or every route.

## What counts as an end-to-end pass

| Flow | Required evidence |
| --- | --- |
| Deposit | Exact token/mint, incoming event, successful canonical receipt, confirmations and actual balance |
| Transfer | Authorized submission, sender/recipient reconciliation, canonical receipt and actual fee |
| Swap | Source execution, actual output/fee and final balance; quote alone is insufficient |
| Bridge | Source transaction and independently verified destination delivery |
| Two-leg gas funding | Both original IDs settled, second leg uses actual first-leg output, destination gas confirmed |
| HyperCore funding | Funding route settled and correct exchange account balance updated |
| Purchase | Test merchant invoice, exact payment, canonical order and supported fulfillment/notification observed without duplication |
| App login | App's genuine challenge, authorized signature and authenticated backend session |
| Standard-mode approval | Delivery/review, rejection/expiry handling, and proof no new execution occurs before approval |
| Limits/revocation | Below/at/above bounds, concurrent requests, retained failure reservations, revoked/expired scope rejection |
| Exchange trade | Venue-acknowledged order and matching fill; separately acknowledge and cancel an actual resting order |
| Recovery after interruption | Retry the same UUID/resource, establish the original outcome and prove no duplicate payment/order |

Use dedicated test accounts and explicitly authorized amounts for monetary checks. Start with read-only discovery and local/testnet execution. A funded mainnet test needs a concrete budget, fee/slippage ceiling, recipient/market and expected result; a documentation or release check does not authorize one.

## 0.10.0 verification — 2026-09-27

| Area | Observed result | Scope |
| --- | --- | --- |
| Exchange, runners, feed, collection and fees | 240 tests passed; 6 skipped | DB/Redis plus provider fixtures, includes native trigger wire validation, approval/revocation, rollback and deduplication |
| Crypto subscriptions | 41 tests passed against isolated Anvil chains | Real local token authorization, renewal, cancellation, allowance/balance failures and multiple deployment selection; no mainnet charge |
| Subscription contract | 15 tests passed, including two 512-case fuzz tests | Local Solidity execution |
| SDK/MCP packages | 37 passed; 4 skipped | 57 tools, exact trigger/runner inputs, retry identity and six native bundles; external live integration tests remain separate |
| Frontend | Typecheck passed | Runner controls and shared-price feed integration |
| Polygon subscription readiness | Passed at block 94533675 | Exact deployed runtime, token, recipient, executor, unpaused state and gas; production cap is two payments per mandate |

Native trigger fills and cancellations have not been demonstrated on a newly funded venue account in this release. Passing local/testnet tests does not guarantee mainnet execution, profitability, liquidity or fees. No user funds were moved during this release verification. Live deployment and delivery benchmark results are recorded separately after rollout.
