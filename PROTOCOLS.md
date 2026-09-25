# Programmable crypto wallet

Version 0.9.0 adds `ourpay_wallet_funding_sources` and `ourpay_wallet_prepare_funding`: detect existing native USDC, quote gas or mainnet Hyperliquid spot/perpetual funding, and execute it through the existing swap/owner-approval workflow. Fees come from the exact USDC input. Same-network gas uses an intermediate USDC leg with a returned continuation. Supported gasless sources are Ethereum, Optimism, Polygon, Base, Arbitrum and Avalanche; actual routes depend on provider liquidity and network configuration. Solana gas is a supported destination, but a Solana-only USDC deposit with zero SOL is not a gasless source. Unsupported assets/networks must never be described as automatically funded.

In version 0.9.0, normal mode requires owner approval for every agent payment, trade, signature and crypto-app connection. OurPay emails the account owner a signed-in review link. Spending requests return HTTP 428 with an approval ID; `ourpay_wallet_approval` tracks it. Owner approval automatically queues the exact action, and `submitted` returns the normal result ID for settlement tracking. Quotes expire and the shared daily cap still applies. Risky mode skips these per-action approvals and emails. Reads, quotes, cancellation and reconciliation of an already-authorized action do not require another confirmation. External host approval controls still apply.

One recoverable wallet derives an EVM address and a Solana address from the owner's existing backup. Agents can discover assets, transfer funds, and convert across supported routes. EVM accounts also support generic contract calls, owner-reviewed signatures and Ethereum-provider requests. Protocol contracts and SDKs provide application-specific behavior; the primitives do not establish that every protocol, chain or trading strategy has been integrated or verified.

## Capability map

| Action | Interface | Conditions |
| --- | --- | --- |
| Discover assets and funding addresses | `networks`, `assets`, `addresses`, `balance` | Chain plus exact contract/mint identifies an asset; symbols are not unique. Solana addresses are case-sensitive |
| Buy/sell EVM tokens and native currency under a pair budget | `quote_trade`, `execute_trade`, `trade` | Same-chain exact-input LI.FI GenericSwapFacetV3 routes on standard-fee EVM networks; owner-created pair budgets, optional expiry, slippage and fee caps |
| Convert or bridge EVM ↔ EVM, EVM ↔ Solana, or swap on Solana | `convert`, or `quote_swap` → `execute_swap` → `swap` | Explicit source amount, minimum output and fee limits; provider liquidity and approved routers/programs required. Restricted call/trading connections cannot bypass policy through these tools |
| Transfer native currency, ERC-20 or standard SPL tokens | `transfer`, `transaction`, `resume_transaction` | Source-chain gas funding; Solana fee/rent cap required. Token-2022 direct transfers are not implemented |
| Transfers, approvals, approval revocation, NFT transfers, lending, borrowing, staking, liquidity positions, vault deposits/withdrawals, governance | `execute_calls`, `rpc` | Owner must authorize the exact target/calldata/value. Use the protocol's verified ABI. These generic primitives are not tested adapters for every named protocol |
| Permit, Permit2, signed orders and protocol login | `request_signature`, `signature` | EIP-191 or EIP-712; exact payload shown to the owner and individually approved. Typed data must include the selected chain in its domain |
| Hyperliquid long/short perpetuals, isolated leverage and standing spot/perp orders | `exchange_capabilities`, `exchange_markets`, `exchange_account`, `place_order`, `exchange_order`, `exchange_orders`, `cancel_order`, `exchange_fills` | Owner permission, funded HyperCore account, GTC/post-only/price-bounded IOC; see exchange trading below |
| Ethereum client libraries | `OurPayProvider` | EIP-1193 request/events interface; policy checks apply on the backend |
| WalletConnect dApps | `OurPayWalletConnect` | SDK adapter, initialized WalletKit/project ID, persistent WalletKit storage and an owner session-approval callback; no hosted QR UI in this release |
| ERC-20/ERC-721/ERC-1155 balances, metadata, positions and allowances | `rpc` using `eth_call` or logs | Known contract/ABI; no automatic portfolio/NFT indexer |
| Contract deployment | Generic call to an approved deployment factory | Direct recipient-less `eth_sendTransaction` creation is unsupported |

The optional built-in catalogue has 39 networks, including Ethereum, Solana, HyperEVM (HYPE), Base, Arbitrum, BNB Chain, Polygon and Avalanche. 38 permit source execution when their RPC and routing provider can supply a valid request. Blast is available for reads and destination settlement only because its complete fee estimate is unavailable. Deployments can override or disable presets. Read `networks` and its `execution_enabled` field at runtime.

There is no fixed USDC-only token list. Search `assets` by symbol or exact contract/mint and use its decimals. HYPE means the native asset on HyperEVM, not a same-symbol token on another chain. A listed asset does not guarantee a liquid route, and tokens with unusual transfer rules may be rejected. Bitcoin, Tron, Sui, Cosmos and other non-EVM/non-Solana signing families are not implemented.

This release adds no smart account, EIP-1271 implementation, on-chain session key, EVM atomic batching, gas paymaster, transaction replacement, scheduled strategy engine, fiat rail or universal merchant adapter. Solana generic program execution, signing arbitrary messages and WalletConnect Solana namespaces are also not exposed. Limits apply to each restricted connection, for its lifetime (token/native base units for calls and swaps; reference notional for the exchange adapter); they are not rolling USD limits across the wallet.

## Automatic conversion

Call `addresses` for the correct receiving address and `assets` for precise token identities. `convert` quotes and starts one durable operation; it does not return a claim of immediate settlement. Supply one saved UUID, source chain/token/amount, destination chain/token, minimum output, slippage and source fee cap. Poll the returned swap ID until `confirmed`. Do not replace the UUID after a timeout.

Solana uses the derivation path `m/44'/501'/0'/0'`. The backend signs a versioned transaction after resolving address lookup tables, checking routing programs, simulating source losses, checking token authority changes and verifying same-chain minimum output. Other required provider signatures are retained and verified. Cross-chain routes additionally trust the configured routing provider to build the bridge instruction; the destination receipt is checked independently. Simulation is not a protocol security audit.

Signed Solana bytes and their signature are retained through retries. Once a recent blockhash expires, an unconfirmed operation stops for reconciliation and is never rebuilt automatically. A new conversion requires a new intentional request after reviewing the original signature. Network and account-rent budgets use lamports. EVM OP Stack estimates include data and operator fees with headroom, but those fees can change before inclusion; the estimate cap is not an on-chain hard ceiling. Bounded call/trade policies exclude these rollups. Native cross-chain EVM delivery may remain pending if the destination RPC cannot provide a required transaction trace.

## Agent trading

Version 0.9.0 defaults to a $10,000 daily USD allowance shared across all connected agents, resetting at 00:00 UTC. Read `wallet().spending` for the current owner-selected limit and Risky-mode state. A swap reserves its source USD value plus up to three transaction fee caps (allowance reset, exact approval, swap); native-input trades reserve one fee cap. Failed or uncertain accepted attempts retain reservations, and retries never debit twice. Owners can change the wallet limit; agents cannot. Existing custom per-agent policies remain until the owner explicitly saves shared settings.

```ts
const capabilities = await wallet.tradingCapabilities()
const trade = await wallet.quoteTrade({
  idempotency_key: crypto.randomUUID(), chain_id: 1,
  sell_token: approvedUSDC, buy_token: '0x0000000000000000000000000000000000000000',
  sell_amount: '10000000', min_buy_amount: minimumETHWei,
  slippage_bps: 50, max_network_fee: feeCapWei,
})
await wallet.executeTrade(trade.id)
const progress = await wallet.trade(trade.id)
```

Persist UUIDs and returned IDs before retries. `progress.swap.status === 'confirmed'` establishes settlement. Route calldata is decoded to verify source amount, destination asset, wallet receiver, native value and minimum return. Unknown selectors are rejected. Native output requires the configured router's matching completion event in a canonical successful receipt.

## Exchange trading: Hyperliquid

Version 0.5.0 adds a complete order-submission and reconciliation path for default Hyperliquid perpetual markets and USDC-quoted spot pairs, on explicit mainnet/testnet environments. `exchangeCapabilities()` returns any active legacy restriction; null means shared wallet settings apply. No per-agent exchange form is needed for a new connection. Read `exchangeMarkets(network, search)` for market IDs, current mark prices, size precision and leverage limits. Limits vary by market. Perpetual entries use isolated margin only; buy opens/adds a long and sell opens/adds a short when there is no opposite position. `reduce_only` exits cannot flip a position.

The same OurPay EVM address owns the exchange account. **HyperCore exchange collateral is separate from HyperEVM HYPE and other on-chain balances.** Fund the account before trading. Use `funding_sources` and `prepare_funding` to route existing supported USDC into mainnet spot/perpetual balances. Withdrawals and internal spot/perpetual transfers remain unsupported. `exchangeAccount()` returns exchange balances, positions, margin, liquidation prices, unrealized PnL and open orders, plus Hyperliquid's funding guide. No recovery phrase needs to be given to an agent.

```ts
const permission = await wallet.exchangeCapabilities()
const markets = await wallet.exchangeMarkets('testnet', 'BTC')
const account = await wallet.exchangeAccount('testnet')
// Save this complete intent durably before calling placeOrder.
const intent = {
  idempotency_key: crypto.randomUUID(), network: 'testnet' as const,
  market: 'perp:BTC', side: 'buy' as const, size: '0.001',
  limit_price: ownerAuthorizedLimitPrice, leverage: 3,
  order_type: 'limit' as const, time_in_force: 'Gtc' as const,
  expires_at: expiryWithinOwnerPermission,
}
const order = await wallet.placeOrder(intent)
const progress = await wallet.exchangeOrder(order.id)
// Cancel and confirm terminal status before submitting a replacement.
await wallet.cancelOrder(order.id)
```

Sizes and prices are human-unit decimal strings, **not integer base units**. Respect venue tick/lot precision. `limit` + `Gtc` rests until filled/canceled; `Alo` is post-only and rejects a crossing order. `market` uses an IOC with the explicit `limit_price` as the worst acceptable fill price: partial or zero fills are possible. There are no stop/trigger orders, cross margin, HIP-3 markets, strategy scheduling or automatic repricing in this release.

Daily-limit mode reserves `size × max(limit_price, current_mark)` plus the allowed taker-fee estimate (default 10 bps), rounded upward to six decimal places. Exits consume the allowance too; failed, canceled and uncertain accepted orders retain reservations. Submission defaults to a 50 bps slippage ceiling. Owner-enabled Risky mode removes budget and per-user fee/slippage restrictions; supported order types, isolated margin, venue precision and reconciliation checks still apply. The daily cap is **not a loss or margin ceiling or a guarantee of future execution value, fees or funding charges**. All agents share it. The wallet's recovery key and previously issued external signatures can authorize activity outside OurPay. Unknown external open orders and incompatible existing position leverage block new entries.

Each action is encrypted and committed before sending. Retries keep the UUID, nonce, signature and client order ID. A timeout never creates a replacement order. `queued`, `submitting` and `open` do not mean filled; `needs_attention` means review the original ID. `filled_size` remains relevant even when an IOC is canceled. Average execution price and fees appear only when complete matching fills are available; empty fees mean unavailable, not zero. `exchangeFills()` uses inclusive timestamp pagination and trade-ID deduplication; the exchange exposes limited recent history, not a full accounting archive.

On expiry, pause, recovery or disconnection, OurPay requests cancellation. The standing order can fill until the venue acknowledges cancellation, especially during outages. Signed `expiresAfter` only limits acceptance of an action; it does not expire an already accepted order. Existing positions remain open and continue to incur funding/liquidation risk. Owners have a separate, explicit reduce-only IOC close control even after agent budgets are exhausted; wallet spending must be enabled. Status reconciliation runs every minute and immediately after submissions/cancellation requests.

The adapter uses the [official exchange API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint), [order/fill status API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint) and [tick/lot rules](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/tick-and-lot-size). Signing vectors match the [official Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/hyperliquid/utils/signing.py). Tests exercise an exchange emulator and real OurPay database/HTTP paths; live market reads do not establish a funded mainnet execution.

## Ethereum provider

The complete distribution contains `dist/wallet-dapps.mjs`; source consumers can import `./provider` and `./walletconnect` from this SDK after building. The SDK is not published to npm.

```ts
import { AgentWalletClient, OurPayProvider } from './dist/wallet-dapps.mjs'
const wallet = new AgentWalletClient({ apiURL, token: securelyLoadedAgentCredential })
const provider = new OurPayProvider(wallet, {
  chainId: 137, maxNetworkFee: explicitFeeCapWei,
  onSignatureRequest: request => showOwnerLink(request.owner_approval_url),
})
const [address] = await provider.request({ method: 'eth_requestAccounts' })
```

Use this provider as Viem's `custom(provider)` transport or an ethers browser provider. Bounded mode requires owner review for arbitrary messages/typed data and restricts calls to decoded transfers. Owner-enabled Risky mode permits supported signatures and arbitrary contract calls automatically. Standard transaction nonce/fee/type overrides are rejected, rather than ignored; OurPay supplies them under the explicit fee cap. Raw `eth_sign`, `eth_signTransaction` and raw submission are unavailable.

`wallet_sendCalls` and `wallet_getCallsStatus` expose the non-atomic version 2.0 batch subset. Up to ten calls are supported. Optional unknown capabilities may be ignored; required unknown capabilities, atomic execution, app-supplied IDs and `wallet_showCallsStatus` are unsupported. Returned hexadecimal IDs encode the durable OurPay batch UUID. This subset is not a claim of complete EIP-5792 conformance.

The provider keeps retry identity and concurrent calls together within one running instance. On a process restart, reconcile saved backend IDs before issuing another request; use the explicit-ID client API for durable agent jobs. Changing chains while a request is pending does not change that request's chain.

## WalletConnect

```ts
import { OurPayWalletConnect } from './dist/wallet-dapps.mjs'
const connector = new OurPayWalletConnect(initializedWalletKit, wallet, {
  maxNetworkFee: explicitFeeCapWei,
  approveSession: (proposal, namespaces) => ownerReviewsSession(proposal, namespaces),
  onSignatureRequest: request => showOwnerLink(request.owner_approval_url),
  onError: error => reportToOwner(error),
}).start()
await connector.pair(ownerProvidedWalletConnectURI)
```

Create WalletKit using your WalletConnect project ID and persistent private storage. Do not auto-approve proposals or treat dApp metadata as authority. A request must match the active session's account, chain and methods, and the backend still enforces OurPay's connection policy. Use a separate scoped OurPay connection for a separate dApp when permissions differ.

The adapter saves the request state before execution and the result before relay delivery. Repeated request IDs return the stored result. After a crash during execution it fails closed, requiring inspection of the original OurPay operation. WalletKit storage contains session material and signed responses: protect it as a credential store. Live relay pairing has not been verified without a configured project ID.

## Protocol integration example: Polymarket

The [official Polymarket TypeScript SDK](https://docs.polymarket.com/getting-started/typescript) accepts a Viem wallet client through `signerFrom(walletClient)`. A Viem client using `custom(provider)` can request signatures from OurPay without receiving its recovery key. Configure the correct account wallet and API credentials as described in [Wallets and Authentication](https://docs.polymarket.com/trading/wallets-auth). Wallet/account provisioning, collateral, order submission/cancellation, order state and any platform restrictions remain Polymarket-specific integration work. A signature is not proof of an order, trade or fill.

## Standards and routing sources

- [EIP-1193 provider requests](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-191 personal messages](https://eips.ethereum.org/EIPS/eip-191) and [EIP-712 typed data](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-5792 call batches](https://eips.ethereum.org/EIPS/eip-5792)
- [LI.FI quote API](https://docs.li.fi/li.fi-api/li.fi-api/requesting-a-quote) and [GenericSwapFacetV3](https://github.com/lifinance/contracts/blob/main/src/Facets/GenericSwapFacetV3.sol)
- [LI.FI Solana routes](https://docs.li.fi/introduction/lifi-architecture/solana-overview) and [transaction execution](https://docs.li.fi/introduction/user-flows-and-examples/solana-tx-execution)
- [Solana transaction simulation](https://solana.com/docs/rpc/http/simulatetransaction)
- [WalletKit session/request API](https://github.com/reown-com/reown-walletkit-js)

Owner grants and standing orders default to until revoked/canceled (`expires_at: null`). A finite owner deadline also bounds order expiry. Agents may end their own session, never extend owner grants. Funding-request tools return exact balances, shortfalls and owner instructions for on-chain assets or Hyperliquid spot/perpetuals; they do not move money.
