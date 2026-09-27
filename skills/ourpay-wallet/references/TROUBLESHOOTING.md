# OurPay Wallet troubleshooting

Start with the exact symptom, host, connector URL, SDK version if local, and original operation ID. Keep private connection files, OAuth tokens, checkout client secrets and recovery phrases out of logs and support messages. Tool inputs and settlement rules are in [TOOLS.md](TOOLS.md) and [WORKFLOWS.md](WORKFLOWS.md).

## The agent sees 44, 45, 47 or 51 tools

SDK 0.10.0 defines **57 tools**. The additional usage guide is `ourpay_wallet_guide`; product discovery is `ourpay_wallet_search_products`. Hosts may rename or prefix display labels, filter tools or return only search matches rather than the complete catalog.

1. Confirm that the remote URL is `https://mcp.ourpay.dev/wallet/mcp`. `/mcp` is the merchant service; the old standalone Render URL is a compatibility endpoint.
2. Ask for a fresh MCP `tools/list`, including pagination if the host exposes it. Restart/reload the host's MCP connection or start a fresh agent session if it cached schemas.
3. For a local plugin, update the installed package/runtime. A server deployment does not update a local stdio bundle. Keep the private connection file; an ordinary software update should not require a new wallet.
4. Call `ourpay_wallet_guide` with `{"topic":"overview"}`. A count by itself is weaker evidence than seeing the intended tool and successfully invoking it.
5. If the canonical endpoint still lacks the tool, an operator must check the **shared `ourpay-mcp` service's** live commit. Deploying only `ourpay-wallet-mcp` does not update the canonical endpoint.

A deployment becoming live plus local route tests is not a fresh authenticated catalog check through your host. Report these as separate pieces of evidence. Do not delete a wallet or grant just to refresh schemas.

## OpenCode: refresh or reconnect?

Run `opencode mcp list`, restart OpenCode after an SDK/server update, and request the guide tool. If it reports missing authentication, use `opencode mcp auth ourpay-wallet` and sign in to the same OurPay account. Change the server name if your configuration uses a different name. These commands follow the [OpenCode MCP documentation](https://opencode.ai/docs/mcp-servers/).

A restart refreshes a cached catalog. Reauthorization is needed for missing/revoked credentials or a changed OAuth resource, not every new tool. Do not run logout/delete credential files as the first troubleshooting step. [Configuration example](INTEGRATIONS.md#opencode).

## Sign-in returns to Home, repeats, or reports `invalid_target`

- Start connection from the agent's connector flow or a newly returned OurPay `setup_url`, not a saved authorization callback or stale request URL.
- Check the exact OAuth resource and callback. Resource-bound tokens issued for the legacy endpoint cannot be sent to the canonical endpoint or vice versa.
- Complete sign-in with the same OurPay account that owns the wallet. A different account is not a wallet-recovery mechanism.
- Operators should verify preservation of state, PKCE, callback, resource and wallet return destination through Google/email login. The wallet authorization server must not be confused with the merchant OIDC configuration.
- A recent-authentication prompt in recovery settings is expected. A successful OAuth refresh alone is not a fresh owner sign-in for phrase access.

Do not bypass account ownership checks or paste the recovery phrase into an agent to resolve an OAuth error.

## Recovery confirmation cannot be clicked

The recovery view and reauthentication prompt must have correct modal focus/stack order. Use the current wallet build and reload if a previous UI bundle is cached. If it repeats, record the browser, viewport and the blocked control without revealing the phrase; the owner should complete the sign-in privately. Closing/reopening a modal is not evidence that authentication succeeded.

The phrase can be re-revealed by the owner after recent sign-in. The wallet hides it when the view closes or loses visibility. Agents should never read the phrase while diagnosing the UI.

## “Approval required” or no approval email

HTTP 428 is the intended Standard-mode approval flow, not a failed payment. Keep the returned approval ID and show the exact `owner_approval_url`. The owner must sign in before approving. If email delivery is delayed, the signed-in review URL can still be used; a missing email does not authorize execution.

Read `ourpay_wallet_approval`: pending, rejected, expired, failed and submitted have different meanings. `submitted` provides the result ID to track; it does not confirm settlement. Do not recreate the payment after the owner approves—the existing approval queues its exact action.

Operators should inspect the approval record and notification delivery/worker errors without logging credentials or resending unrelated messages. Signature and app-connection reviews are tracked through their own resource responses.

## Risky mode is on but an action is rejected

Risky mode does not enable every blockchain, bypass exchange precision, unpause the wallet, revive a revoked app/agent, supply missing funds or ignore a host's approval policy. Read current capabilities and the exact error. Legacy scoped policies may still restrict this connection. An explicitly supplied revoked `dapp_connection_id` must fail; removing the ID to sign unscoped is not a valid fix.

## Funding scan fails but a direct balance succeeds

Read each funding source's `available`, `balance`, `error_code` and `error`. A partial provider timeout must not replace successfully read networks with zeros. Retry the failed read with a bounded delay and compare the exact native-USDC contract and network using `ourpay_wallet_balance` or read-only RPC.

Funding discovery is limited to enabled native-USDC source networks. A token with the same ticker, a disabled network or an unsupported source family may hold value without appearing as an available funding source. An empty OurPay transaction list also does not rule out external deposits.

## Not enough native gas

A token balance does not pay a chain's native transaction fee by itself. Inspect `funding_sources`, prepare supported gas funding from existing USDC, verify all required legs, then recheck the destination native balance before resuming the task.

If the first leg is only `quoted`, nothing has moved. If it is confirmed and has a continuation, quote the next leg from actual `received_amount`. Do not reuse the original expected amount. A provider minimum or an output below the minimum is a route constraint, not automatically a total-wallet insufficiency.

## Funding or conversion has no route

| Evidence | Action |
| --- | --- |
| Insufficient verified source balance | Reduce the intended action within the user's instructions or show a funding request for the actual shortfall |
| Provider minimum / minimum output rejection | Quote a viable amount within the authorized budget; do not silently lower the destination minimum |
| Fee ceiling exceeded | Explain the quoted costs and remaining budget; do not increase the ceiling automatically |
| Provider timeout, rate limit or RPC failure | Mark result unknown and retry reads; first reconcile any operation that might already exist |
| Source execution disabled / unsupported token | Discover a supported funded route; do not attempt unrestricted raw submission |
| Expired quote | Establish that the original quote did not execute before preparing a new intentional quote |
| `needs_attention` after submission | Inspect the original IDs and available receipts; never report success or create a replacement blindly |

Preserve provider details behind a readable explanation. A generic timeout does not establish insufficient funds, and a source-chain receipt does not establish destination settlement.

## Hyperliquid shows no funds or only one market

HyperCore exchange collateral is separate from on-chain USDC and HyperEVM HYPE. Check the correct mainnet/testnet environment, spot/perpetual account, market `dex` and collateral token. A total portfolio value does not guarantee withdrawable margin.

Discover markets with search and pagination; clear a search filter to browse. Use the exact returned ID. If a request searches for XRP but a cached UI selection still shows BTC, that is a selection/loading problem, not evidence that XRP is unsupported. Check current market response, selection and timestamp.

Market snapshots can contain partial errors. Missing candles are unknown, not a flat chart. The wallet UI can receive live updates, while an agent's market-data tool is a snapshot that it must refresh as needed.

## An exchange order is queued, canceled or needs attention

Read the original OurPay order ID, venue acknowledgment, `filled_size`, failure reason and matching fills. Local cleanup or a canceled local record with no venue order ID does not prove a resting order was submitted and canceled at the exchange.

- A price-bounded IOC can partially fill and cancel the remainder.
- A post-only order can be rejected if it would immediately cross.
- Unsupported size/price precision requires correcting the intent, not bypassing checks.
- Unknown external open orders, unresolved same-market submissions or incompatible leverage/margin settings can block a new entry.
- Canceling an order does not close a position. Pause/revocation requests cancellation, but fills can race the venue response.

Do not reprice by creating a replacement until the original state is established. Full order rules are in [PROTOCOLS.md](PROTOCOLS.md#exchange-trading-hyperliquid).

## Hyperliquid opens history instead of logging in

An address explorer is read-only. A URL containing an address does not authenticate a wallet. Use the wallet's **Connect to Hyperliquid** WalletConnect flow, approve the browser connection, and keep that wallet tab open. The app must show the same connected address. Website terms and any required account setup remain separate actions.

The supported signing flow can help the connected site request a withdrawal, but a signature alone is not proof the exchange accepted it or paid the destination. There is no standalone automatic-withdrawal MCP tool in this release.

## Product search or purchase is incomplete

Search finds eligible public OurPay products by keywords, not arbitrary internet merchants or semantic inventory matches. Open each candidate's returned checkout URL for current details. An unpaid checkout or prepared invoice is not a purchase. A recurring listing does not establish recurring crypto payment support.

Missing buyer details, unsupported merchant payment methods, expired invoices and changed totals need resolution before execution. Preserve the checkout secret privately and reuse the original purchase ID. Confirm `succeeded` plus `order_id`; then distinguish platform fulfillment from any separately verified shipping or external delivery.

## What to include in a bug report

Provide the host and version, sanitized endpoint path, UTC timestamp, tool name, network/market, expected result, observed status/error code, and original OurPay operation ID. Public transaction hashes can help reconcile chain state. Include the exact installed release/commit and whether the failure occurred in Standard or Risky mode.

Exclude seed/private keys, access/refresh tokens, local connection JSON, WalletConnect pairing URIs, checkout secrets and unrelated personal data. For an uncertain monetary action, describe the original operation before anyone retries it.

## Shared feed and trading plans

- `reset=true`: discard selected-market local state, apply the returned snapshot and resume with the new cursor. The retained stream is short; it is not a historical tick archive.
- `stale_markets` or `unavailable_markets`: do not replace missing data with zero. The runner waits for fresh data and retries at its interval. Check API feed leadership and Redis before restarting a plan.
- A chat has stopped receiving data: tool calls cannot wake idle ChatGPT/Claude conversations. Use SDK `watchExchange` in a running host, or a bounded OurPay runner for previously submitted decisions.
- Plan active but no trade: inspect next check, condition, account collateral, owner approvals, last error, attempt cap and reference-notional budget. Active means scheduled.
- Plan paused with uncertain order: reconcile the original order ID. Do not create another plan to retry that order. Resume only after the original outcome is known and ongoing authorization remains.
- Stop order triggered but no fill: check venue status and actual fills. A triggered limit can rest unfilled; a market-trigger IOC can partially fill. Cancellation and a trigger racing each other can result in execution before cancellation.
