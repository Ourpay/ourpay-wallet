# Using OurPay Wallet

OurPay Wallet is one account-owned crypto wallet shared with the AI agents you authorize. Your account, wallet addresses and funds remain the same when you connect another supported agent. Each connection has its own access that you can revoke.

[Open your wallet](https://wallet.ourpay.dev/wallet) · [Connect an agent](https://wallet.ourpay.dev/agents) · [Setup instructions](INTEGRATIONS.md) · [Troubleshooting](TROUBLESHOOTING.md)

## First-time setup

1. Open OurPay Wallet and sign in to your OurPay account. Use the same account in every agent's connection flow.
2. Create the account wallet if you do not already have one. If you already have a wallet, use that wallet or the recovery flow; do not create a replacement to fix a timeout.
3. Save the recovery phrase privately during setup. Never paste it into ChatGPT, Claude, a coding agent, support chat or a merchant page.
4. Add the OurPay connector or install a package for your agent. The hosted MCP address is `https://mcp.ourpay.dev/wallet/mcp`.
5. Follow the OurPay sign-in and consent flow. Check the app name and requested access before approving it.
6. Ask the agent to call `ourpay_wallet_guide` with `{"topic":"overview"}`, then `ourpay_wallet`. It should identify your existing wallet and its permissions.
7. Fund the address for the network you choose. Wait for a confirmed balance before asking the agent to spend it.

An address alone does not sign you in. OAuth, your signed-in owner session or a separately authorized local connection provides access. Wallet creation and connection are distinct from paying or trading.

## Understand the wallet screens

| Screen | What to use it for |
| --- | --- |
| Wallet / Home | Portfolio summary, tracked assets, receiving addresses, Send and agent activity |
| Trade | Hyperliquid account, collateral, markets, chart, positions, orders and funding/connection actions |
| Activity | Deposits detected by the wallet, transfers, conversions, purchases and exchange activity; expand grouped operations for their individual transactions |
| Agents | Recognizable app groups, individual sessions, last activity, granted permissions and disconnect controls |
| Settings | Wallet preferences, shared spending limit, Advanced Risky mode and recovery phrase access |

“Connected” means an app is authorized. It does not mean the app is currently running, watching markets or executing a strategy. Last activity is evidence of a previous request, not an agent heartbeat.

Activity and portfolio views depend on the supported networks, tracked assets and available providers. An empty view or failed provider read does not establish that no deposits occurred. The MCP transaction list currently covers OurPay-initiated transactions; it is not a complete external-deposit index. See [deposit verification](WORKFLOWS.md#verify-a-deposit).

## Fund the wallet once

Choose the receiving network and copy its address. EVM networks share this wallet's EVM address, while Solana has a different address. Balances on Ethereum, Polygon, Arbitrum and other networks are separate even when the EVM address is identical.

For automatic gas and Hyperliquid funding, the current supported gasless source is **native USDC** on enabled Ethereum, Arbitrum, Base, Optimism, Polygon and Avalanche networks. Confirm the token contract, not only the symbol: bridged `USDC.e` and other tokens named USDC are not interchangeable with native USDC for these routes.

The agent can inspect existing USDC, quote a route to the gas or exchange balance it needs, and execute that route under your settings. Provider fees are included in the authorized USDC input. This is paid conversion/funding, not unlimited free gas.

There is no single top-up amount that guarantees every action. Network fees, bridge minimums, venue minimum sizes, available liquidity and your task determine the requirement. A small top-up on a cheaper network may cover a small test but not an Ethereum operation plus several exchange trades. Ask for a current quote and total budget before funding for a specific task.

Solana can receive gas through supported routes, but a Solana-only USDC balance with zero SOL is not currently a gasless source. Other tokens can use ordinary swaps when source gas and a route are available. [Funding mechanics](WORKFLOWS.md#fund-gas-or-hyperliquid-from-existing-usdc).

## Where the money is

| Location | Meaning |
| --- | --- |
| On-chain wallet | Assets held at your address on each blockchain; native currency pays network fees |
| Hyperliquid HyperCore | Exchange balances used for spot orders and perpetual collateral |
| Committed collateral | Exchange margin supporting open positions; not necessarily available to withdraw or spend elsewhere |
| Pending transfer | Funds in a submitted transfer, bridge or exchange deposit whose final receipt is not yet verified |

HyperEVM HYPE is an on-chain asset. HyperCore spot HYPE, perpetual collateral and an Arbitrum USDC balance are different holdings. A normal transfer to your address on Arbitrum or HyperEVM does not by itself fund your HyperCore exchange account.

Portfolio values are estimates from available price data. Missing or stale valuations must not be treated as zero. A portfolio total is not a promise that the entire amount is immediately spendable.

## Standard mode and Risky mode

| Setting | Standard mode | Owner-enabled Risky mode |
| --- | --- | --- |
| New payment, trade, contract-call submission, signature or app connection | Owner review required | Supported actions can proceed without OurPay per-action review |
| Review notification | OurPay sends the owner a review link by email; the agent also receives the review URL | Per-action approval emails are skipped |
| Shared daily limit | Defaults to $10,000 per wallet per UTC day, across agents; owner can change it | Shared daily spending cap is bypassed |
| Reads and quotes | No spending approval required; quotes alone do not move money | Same |
| Pause, revocation and supported-action checks | Enforced | Enforced |
| Host's own approval rules | Still apply | Still apply |

The daily allowance resets at 00:00 UTC. It reserves estimated authorized value and fee allowances; it is not a maximum-loss guarantee. Swapping and then paying can count as separate actions. Failed or uncertain accepted attempts may retain their reservation. Legacy per-agent restrictions remain relevant until the owner explicitly moves the connection to shared settings.

An agent cannot enable Risky mode, increase limits or grant itself new owner authority through MCP. Technical access also does not tell an agent what to buy or how to trade: it still needs your task and budget. [Detailed permission and approval behavior](WORKFLOWS.md#permissions-and-owner-approvals).

Permissions may last until revoked, with an optional owner-chosen expiry. Login sessions, access tokens, quotes and signing requests can still have their own deadlines. A refreshed OAuth token does not recreate your wallet or reset your spending permissions.

## Buy from OurPay merchants

You can ask, for example: “Find red running shoes from OurPay merchants within a total 20 USDC budget. Compare the available options and buy the one that matches my size.”

The agent searches the public OurPay product index, opens candidate checkout details, compares images, descriptions and prices, and obtains any missing buyer information. You do not need to supply the checkout link yourself. Search supplies the links internally.

Preparing a checkout creates an unpaid invoice. Payment still uses the wallet's quote, conversion, approval and settlement checks. Only a successful purchase with an `order_id` establishes completion. Physical shipping and other fulfillment details must be available through the merchant's supported checkout; the agent cannot invent them or assume a delivery integration exists.

The index covers eligible OurPay merchants. It does not make arbitrary Amazon, Shopify, bank, UPI or card checkouts automatically payable.

After you authorize a purchase, OurPay confirms it automatically. Ethereum can show a successful transaction before its block is finalized for merchant settlement. Keep the original purchase; do not pay again. Activity shows automatic confirmation in progress, and the agent can poll the same purchase ID.

Account owners receive a “Payment submitted” tracking email after broadcast, followed by the merchant order confirmation after verified settlement and fulfillment. The early email is not a receipt or proof of delivery. Email-provider or inbox delays are still possible.

Agents can also buy supported recurring USDC subscriptions. The checkout states the maximum charge, billing interval and finite payment count; Standard mode asks you to approve these terms together. The configured recurring network is Polygon native USDC, currently limited to two payments per mandate. The first charge can use the wallet's supported conversion flow, but future renewals need USDC available on the selected network. Cancel the subscription through its customer portal to stop renewal: pausing your wallet or disconnecting the agent does not cancel a mandate you already authorized. [Recurring purchase details](WORKFLOWS.md#buy-a-recurring-usdc-subscription).

## Trade with an agent

For on-chain swaps, the agent discovers the exact token and network, quotes the route, checks the minimum received amount and fees, and tracks settlement. A quote alone is not a trade.

For Hyperliquid, the agent can discover spot and perpetual markets, including supported builder-deployed markets, inspect prices, order books, candles, fees, positions and collateral, and place supported orders within your instructions. The toolset supports isolated or supported cross margin, leverage within venue limits, standing limit orders, post-only orders, price-bounded immediate-or-cancel orders, reduce-only exits and independently tracked concurrent orders.

For continuous operation, ask your agent to create a bounded persistent trading plan with a maximum number of attempts and a reference-notional budget. OurPay runs the fixed plan after the chat closes; normal mode still requires each order approval. Native stop-loss/take-profit orders rest at Hyperliquid. An agent making new discretionary decisions needs its own persistent host. Neither path promises profit or high-frequency execution; automatic repricing and atomic OCO brackets are not implemented. [Hyperliquid details](PROTOCOLS.md#exchange-trading-hyperliquid).

## Open your wallet in Hyperliquid

Use **Connect to Hyperliquid** from the wallet's trading experience and approve the browser connection. WalletConnect pairs the official Hyperliquid website with the same OurPay address. Keep the wallet browser tab open to handle supported requests. A trading URL or an address-explorer link alone does not authenticate the wallet.

The website may request its own terms acceptance, account setup or signatures. Standard mode sends supported requests for owner review; Risky mode processes supported requests under the active grant. Direct OurPay exchange tools do not expose standalone withdrawal or spot/perpetual collateral-transfer methods. The connected Hyperliquid website can request supported signatures for those operations; the website still has to submit them, and the resulting exchange state or destination receipt must be verified.

## Recovery phrase and account recovery

You can view your recovery phrase later in **Settings → Security → Recovery phrase**. Confirm that you are in a private place. OurPay requires a recent owner sign-in and may redirect you to sign in again before revealing it. The phrase is hidden again when the recovery view closes or loses visibility.

OurPay stores an encrypted backup; recovery depends on the account service and access to its encryption keys. Your privately stored phrase provides an independent backup. Agents and MCP tools do not receive it.

The [Recover wallet](https://wallet.ourpay.dev/wallet/recover) page derives a recovery proof in the browser. The recovery process preserves wallet addresses and revokes old connections. Reconnect your agents afterward. Never use an agent chat as your phrase backup.

## Pause, disconnect and track outcomes

- **Pause** stops new spending submissions. It cannot undo a transaction already broadcast.
- **Disconnect an agent/session** revokes that connection and its app grants. Other separately authorized connections remain separate.
- **Disconnect an app** stops new authorization within that app grant. Previously issued signatures and on-chain allowances can remain usable.
- **Exchange cancellation** is a request to the venue. An order can fill until cancellation is acknowledged. Canceling orders does not close positions.
- **Failed or uncertain action** should be inspected using its original operation ID; starting another payment or order may duplicate it.

For missing tools, repeated sign-in, pending approvals, partial bridges or stale balances, use [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
