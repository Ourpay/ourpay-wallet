<p align="center"><img src="assets/logo.png" width="96" height="96" alt="OurPay Wallet"></p>

# OurPay Wallet

One account-owned crypto wallet for you and your authorized AI agents. Sign in to the same OurPay account from ChatGPT, Claude, a coding agent or a compatible application to use the same wallet, with separately revocable connections.

**57 tools · 6 native packages · 18 client profiles · 5 model tool formats · 4 framework examples**

[Open wallet](https://wallet.ourpay.dev/wallet) · [Connect an agent](https://wallet.ourpay.dev/agents) · [Release downloads](https://github.com/Ourpay/ourpay-wallet/releases/latest) · [All tools](TOOLS.md)

## What it can do

| Area | Implemented capabilities |
| --- | --- |
| Account and wallet | Account sign-in, EVM/Solana addresses, supported-network and asset discovery, balances, owner recovery and revocable agent connections |
| Transfers | Native currency, ERC-20 and standard SPL transfers, receipt tracking and durable retries |
| Conversion | Supported same-chain swaps and EVM/Solana cross-chain routes with explicit minimum output, slippage and fee limits |
| Funding | Discover native USDC and quote gas, destination USDC or mainnet Hyperliquid collateral funding; continue multi-leg routes using actual received amounts |
| Merchant purchases | Search eligible OurPay products, open candidate checkouts, inspect details, prepare crypto invoices, quote/convert/pay and track the canonical order |
| EVM applications | Simulated sequential contract calls, personal/EIP-712 signatures, app grants, read-only RPC, an Ethereum provider and WalletConnect adapter |
| Shared data and plans | Shared market feed, cursor/long-poll updates and server-run bounded trading plans; see [TRADING.md](TRADING.md) |
| Hyperliquid | Spot/default/HIP-3 market discovery, book/candle/trade snapshots, account and fee data, isolated or supported cross margin, leverage, GTC/ALO/IOC and native perpetual stop-loss/take-profit orders, concurrent independent orders, cancellation and fills |
| Owner control | Standard-mode action approval with email review links, shared daily allowance, owner-enabled Risky mode, pause and disconnect |

Availability depends on enabled networks, exact assets/markets, liquidity, provider/venue state and owner permissions. General wallet signing is not a complete integration with every dApp. Persistent plans execute bounded instructions; they do not host an LLM that invents or revises strategies. Complete Polymarket trading, arbitrary internet checkout and fiat/card/UPI payments remain outside the wallet. [Full capability boundaries](PROTOCOLS.md).

## Connect with OAuth

Add this Streamable HTTP MCP server to a host that supports remote MCP with OAuth:

```text
https://mcp.ourpay.dev/wallet/mcp
```

Use the full `/wallet/mcp` path. Follow OurPay sign-in and consent, using the account that owns your wallet. The host's plan, version and administrator settings can affect connector availability. Custom-connector support and repository installation are separate from vendor public-directory approval.

Then ask:

> Call `ourpay_wallet_guide` with topic `overview`, then read my wallet and supported networks. Do not submit any payment, signature or trade.

The guide provides task-specific instructions. A fresh 0.11.0 catalog has **57 tools**: three checkout tools and 54 wallet tools. Purchase tools support bounded USDC subscriptions with explicit recurring consent and automatic settlement progress. Restart a host that cached an older schema; update the executable as well if using a local package. An ordinary tool update does not require a new wallet. [Refresh and troubleshooting](TROUBLESHOOTING.md).

## Install in coding agents

Local packages require Node.js 24 or newer and include the MCP runtime. The server does not need a merchant API key or an npm install to run. Its first wallet call returns account authorization; it does not ask for your recovery phrase.

### Claude Code

```sh
claude plugin marketplace add Ourpay/ourpay-wallet
claude plugin install ourpay-wallet@ourpay
```

### Codex

Add the public repository marketplace, then install `ourpay-wallet` from OurPay in the plugin browser:

```sh
codex plugin marketplace add https://github.com/Ourpay/ourpay-wallet.git
```

### Gemini CLI

```sh
gemini extensions install https://github.com/Ourpay/ourpay-wallet
```

### GitHub Copilot CLI

The repository root implements the portable Agent Plugins format:

```sh
copilot plugin install Ourpay/ourpay-wallet
```

### Cursor and Claude Desktop

Use their native release packages from [downloads](https://github.com/Ourpay/ourpay-wallet/releases/latest). Cursor includes a local plugin manifest; Claude Desktop uses `.mcpb`. If a managed runtime is older than Node 24, use the generated configuration with a compatible external Node executable.

### OpenCode and other hosts

OpenCode can use the hosted OAuth URL directly. The complete integrations archive generates profiles for Codex, Claude Code, Claude Desktop, Cursor, VS Code/Copilot, Windsurf, Cline, Roo Code, Continue, Gemini CLI, OpenCode, Kiro, Goose, Zed, Copilot CLI, LM Studio, Kilo and generic MCP clients.

From the complete extracted bundle:

```sh
node configure.mjs --list
node configure.mjs --target opencode --transport remote
node configure.mjs --target all --out ./local-configs
```

Merge the generated server entry into your existing configuration. Do not replace unrelated servers. Private local connection files must remain on your machine and persist across restarts. The SDK is not published on npm; do not use `npx @ourpay/agent-wallets` as an installation method. [Complete integration instructions](INTEGRATIONS.md).

## Fund once, then authorize the task

Send the correct asset to the wallet address for your chosen network. EVM networks share one EVM address; Solana uses another. Every chain's balance remains separate.

Agents can use native USDC on enabled Ethereum, Optimism, Polygon, Base, Arbitrum and Avalanche networks to obtain gas or mainnet Hyperliquid collateral through supported funding routes. Fees come from the authorized USDC input. Routes, minimum sizes and liquidity still matter; this does not provide free gas or universal support for every chain. Solana can receive gas through supported routes but is not a zero-SOL USDC gasless source.

HyperCore exchange collateral, HyperEVM HYPE and on-chain USDC are distinct balances. A funding quote does not prove delivery, and an exchange account value does not mean all collateral is withdrawable. [Funding and settlement workflow](WORKFLOWS.md#fund-gas-or-hyperliquid-from-existing-usdc).

## Permissions and recovery

Standard mode requires owner review for new payments, trades, contract submissions, signatures and app connections. OurPay sends an email review link and returns the owner URL to the agent. The default $10,000 daily USD allowance is shared across agents and resets at 00:00 UTC; owners can adjust it. Reservations are authorization estimates, not maximum-loss guarantees.

Owner-enabled Risky mode skips supported per-action approvals and shared spending restrictions. Pause, revocation, supported-action validation and the host's own controls still apply. It does not authorize an agent to invent a trading strategy or spend outside your task.

Save the initial recovery phrase privately. You can reveal it later in wallet Settings after recent owner authentication. OurPay retains an encrypted backup; the owner-held phrase is an independent backup. Agents never receive it. Recovery preserves addresses and revokes prior connections. [Owner guide](USER_GUIDE.md).

## Agent and developer documentation

| Document | Contents |
| --- | --- |
| [USER_GUIDE.md](USER_GUIDE.md) | Setup, wallet screens, funds, recovery, Hyperliquid website connection and controls |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Host configs, OpenCode, OAuth, local credentials, model adapters, frameworks and upgrades |
| [WORKFLOWS.md](WORKFLOWS.md) | Exact amount units, approval handling, funding, purchases, trading, retries and completion evidence |
| [PROTOCOLS.md](PROTOCOLS.md) | Supported networks/protocols, Hyperliquid details, provider/WalletConnect behavior and limitations |
| [TOOLS.md](TOOLS.md) | All 57 canonical tools, descriptions and complete input JSON Schemas |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Cached tools, sign-in, approvals, gas/route failures, stale data and uncertain orders |
| [TESTING.md](TESTING.md) | Test commands, skipped/live distinctions and what an end-to-end pass requires |
| [RELEASE_VERIFICATION.md](RELEASE_VERIFICATION.md) | v0.10.0 deployments, live client discovery, benchmarks and verification limits |
| [DISTRIBUTION.md](DISTRIBUTION.md) | Public distribution routes and vendor-review boundaries |
| [CHANGELOG.md](CHANGELOG.md) | Versioned changes and repository documentation updates |
| [Agent skill](skills/ourpay-wallet/SKILL.md) | Task-oriented instructions and packaged references |

Model adapters support OpenAI Responses, Chat Completions-compatible function tools, Anthropic Messages, Gemini and tool-capable Ollama models. Framework examples cover OpenAI Agents SDK, LangChain/LangGraph, PydanticAI and Google ADK. The application supplies its model credentials, tool filters and execution loop; the wallet does not select a model or run a strategy for it.

## Source and verification

Build the distributed SDK source with Node 24+:

```sh
cd source
npm ci
npm run build
```

The application repository owns the full tests and generation pipeline; this public repository includes the SDK source, plugin manifests, packaged runtime and documentation. Local packaging/schema/fixture tests, live read checks and funded execution are different evidence. See the [v0.10.0 release verification](RELEASE_VERIFICATION.md) for live deployments, all 57 tools observed in ChatGPT, snapshot benchmarks and the funded acceptance tests that remain unverified. Earlier release evidence remains in [TESTING.md](TESTING.md).

Documentation on `main` can be newer than a tagged package. Tags, archives and checksums remain fixed; changes to this README do not upgrade an installed executable. Pin a reviewed tag/commit for reproducible Git installs and use the matching release archive when updating a runtime.

Licensed under [Apache-2.0](LICENSE). Bundled dependencies are documented in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). No recovery phrase, connection credential or backend custody secret belongs in this repository.
