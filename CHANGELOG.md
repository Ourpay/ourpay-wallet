# Changelog

## 0.11.0 — 2026-09-27

- Buy bounded recurring USDC subscriptions through the existing checkout and purchase tools, with explicit per-payment limits, cadence and payment count.
- Prepared checkouts include canonical payment instructions. Subscription quotes reserve the complete mandate cap; approval and authorization use durable retry IDs.
- Purchase progress explains automatic settlement and finality, includes a recommended polling interval, and clears recovered provider errors.
- Account owners receive a payment-submitted tracking email before final settlement; the order confirmation remains tied to verified fulfillment.
- Wallet activity groups allowance and subscription authorization, and owner review displays the recurring commitment. The tool count remains 57.
- Renewal conversion is not automatic. Cancel an authorized subscription separately from pausing the wallet or disconnecting an agent.

## 0.10.0 — 2026-09-27

- Five new tools bring the catalog to 57: shared exchange updates and create/list/read/control persistent trading plans.
- Native perpetual stop-loss/take-profit market and limit orders, with reduce-only exits and reconciliation that distinguishes triggering from filling.
- One server feed per exchange environment, shared public REST cache, coalesced filtered updates, cursor resets and explicit stale data.
- Durable bounded plans continue on OurPay workers after a chat closes. Owner approvals and original connection permissions still apply.
- Wallet Trade screen shows persistent-plan status and pause/stop controls. Public data and private account reads remain separate.
- Deployment, billing, architecture, workflow and test documentation updated. Recurring USDC uses bounded on-chain mandates; INR fee is 5% without a fixed component.


## Documentation update — September 27, 2026

- Add an owner guide covering wallet screens, funding, permissions, recovery and Hyperliquid website connection.
- Add detailed workflows for approvals, exact amount units, two-leg gas funding, transfers, swaps, product discovery/purchases, dApps and exchange execution.
- Generate the complete 52-tool input reference directly from the MCP registry and verify it during documentation checks.
- Expand OpenCode refresh/authentication instructions, troubleshooting and dated testing/coverage boundaries.
- Package the same maintained references with all native agent skills and Gemini context; keep relative links usable in each distribution.
- Correct stale tool counts, old package filenames, one-time-only recovery wording and the distinction between direct exchange methods and connected-app signing.
- Document the canonical shared MCP deployment requirement. Repository documentation changes do not overwrite the immutable 0.9.6 archives or change wallet permissions/runtime behavior.

## 0.9.6

- Add `ourpay_wallet_guide` with task-specific workflows for every supported wallet operation, including market discovery, charts and parallel exchange orders.
- Expose the same order-precision constraints used by the signer and the account’s base fee schedule; unavailable fees remain explicit.
- Reject inconsistent or duplicate candle data without hiding valid market sections.
- Consolidate shared MCP tool annotations without changing permissions or existing tool names.
- 52 tools across six native packages, 18 client profiles and model adapters.

## 0.9.5

- Search automatically indexed public products across OurPay merchants, with names and reusable checkout links.
- Open product checkouts to inspect current details and use the existing authorized wallet purchase flow without a user-supplied link.
- Keep private products and buyer sessions out of search; recheck eligibility when opening a checkout.
- 51 tools across the existing MCP and model adapters; six native packages and 18 client profiles.

## 0.9.4

- Preserve app identity when a browser requests individual owner review outside its delegated signing rules.
- Support documented Hyperliquid exchange signing domains for active official app grants without changing the signed payload.
- Reuse backend operation IDs across browser tabs and preserve market price precision.

## 0.9.3

- Pair the browser wallet with crypto apps through WalletConnect using a separate revocable credential.
- Stream Hyperliquid market updates and search the full spot and perpetual catalogue, including builder-deployed venues.
- Choose explicit isolated/cross margin and submit up to ten independent orders concurrently with per-order retry identity.
- Read positions and collateral by venue; preserve pre-upgrade order retries.


## 0.9.1

- Public distribution repository with installable Codex, Claude Code and Cursor marketplace manifests, Gemini extension metadata and a portable Agent Plugin.
- Consistent OurPay Wallet name and OurPay logo across native packages and MCP metadata.
- Corrected the Codex manifest version and added package/version consistency checks.
- Official MCP Registry metadata for the hosted OAuth connector.

## 0.9.0

- Discover existing USDC and quote funding for network gas or Hyperliquid.
- Execute supported funding routes through the existing owner-approval and settlement workflow.
- Preserve the signed authorization across retries and verify source and destination settlement.
- Six native packages, 18 client profiles and 47 tools.
