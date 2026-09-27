# Changelog

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
