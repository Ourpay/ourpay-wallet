<p align="center"><img src="assets/logo.png" width="96" height="96" alt="OurPay Wallet"></p>

# OurPay Wallet

One account-owned crypto wallet for you and your AI agents. Sign in to your OurPay account from each agent to connect the same wallet.

[Open your wallet](https://wallet.ourpay.dev/wallet) · [Install and connect](https://wallet.ourpay.dev/agents) · [Release downloads](https://github.com/Ourpay/ourpay-wallet/releases/latest)

## Connect with OAuth

Add this Streamable HTTP MCP server to a host that supports remote MCP with OAuth:

```text
https://mcp.ourpay.dev/wallet/mcp
```

Follow the OurPay sign-in link and authorize that agent. The host's plan and administrator settings can affect connector availability. Custom connector support does not mean the plugin is listed in that host's public directory.

## Coding agents

Local packages need Node.js 24 or later. They include the MCP runtime, so an API key or an npm install is not needed to run them. The first wallet call opens account authorization. Do not paste a recovery phrase into your agent.

### Claude Code

```sh
claude plugin marketplace add Ourpay/ourpay-wallet
claude plugin install ourpay-wallet@ourpay
```

### Codex

Add this public repository as a marketplace, then install `ourpay-wallet` from the OurPay marketplace in the plugin browser:

```sh
codex plugin marketplace add https://github.com/Ourpay/ourpay-wallet.git
```

### Gemini CLI

```sh
gemini extensions install https://github.com/Ourpay/ourpay-wallet
```

### GitHub Copilot CLI

The repository root implements the Agent Plugins format:

```sh
copilot plugin install Ourpay/ourpay-wallet
```

### Cursor and Claude Desktop

Download the matching package from [Releases](https://github.com/Ourpay/ourpay-wallet/releases/latest). Put the extracted Cursor plugin in `~/.cursor/plugins/local/ourpay-wallet` and reload Cursor. Open the `.mcpb` bundle in Claude Desktop; its managed runtime must support Node 24. Where it does not, use the hosted OAuth connector or an external Node runtime as described in [INTEGRATIONS.md](INTEGRATIONS.md).

The integration bundle also generates configurations for 18 clients and includes adapters for OpenAI-compatible APIs, Anthropic, Gemini, Ollama, LangChain, Pydantic and Google ADK. See [the full integration guide](INTEGRATIONS.md).

## Capabilities

The same 47 MCP tools provide wallet addresses, balances, network and token discovery, transfers, swaps, bridging, OurPay merchant checkout, policy-constrained contract calls, signing, crypto-app connections, and Hyperliquid spot/perpetual orders.

Supported native USDC on Ethereum, Arbitrum, Base, Optimism, Polygon and Avalanche can fund network gas and Hyperliquid through quoted routes. Availability depends on network configuration, providers and liquidity. Solana-only USDC with zero SOL is not a supported gasless source. HyperCore withdrawals and internal collateral transfers are not implemented.

Normal mode requires owner approval for each payment, trade, signature and app connection, with an email linking to the review page. The default USD spending limit is $10,000 per day shared across agents, adjustable by the owner. Owner-enabled Risky mode removes OurPay's per-action prompts and budget checks for supported actions; host controls, pause and revocation still apply.

Read [PROTOCOLS.md](PROTOCOLS.md) for the precise capability map. A pending transaction or order is not a confirmed payment or fill.

## Release verification

Wallet execution and retry logic passed 217 backend tests using local chains and simulated providers. The previous runtime release passed 28 SDK and 19 hosted MCP checks; four optional SDK integration tests require separate fixtures and were skipped. Public provider quotes and deployed read endpoints were checked. A funded mainnet end-to-end deposit and trade has not yet been verified.

Public downloads and a self-hosted marketplace are separate from a reviewed vendor directory listing. [DISTRIBUTION.md](DISTRIBUTION.md) records the publication routes and restrictions.

## Source and privacy

The MCP client source is in `source/src`. To typecheck and build it, run `npm ci && npm run build` in `source/` using Node 24+. Wallet signing and custody run on OurPay's hosted service; they are not part of this client repository. Local connection credentials are stored privately outside the plugin and must never be committed. The tools do not return recovery phrases or private keys.

The client code is Apache-2.0 licensed. Bundled dependency licenses are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). The OurPay name and logo identify the service and are not a grant of trademark rights.
