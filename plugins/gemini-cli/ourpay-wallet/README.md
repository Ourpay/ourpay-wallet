# OurPay Wallet plugin

One account-owned wallet for an owner and their agents. The plugin exposes 45 MCP tools for EVM/Solana addresses, token discovery, transfers, conversion, trading, signatures, OurPay purchases, simulated contract calls, Hyperliquid spot/perpetual orders, funding requests and approval tracking. Use a tool-capable model in your host. Node 24 or newer must be available to the host as `node`.

Normal mode emails the owner to approve each new payment, trade, signature and app connection. Spending results include an approval ID and review URL; `ourpay_wallet_approval` follows that request to its execution result. Only the owner can approve it. Owner-enabled Risky mode runs supported actions without per-action confirmations or approval emails. External host confirmations remain independent.

This folder contains a self-contained server; no npm install is needed. Keep the entire folder together. Install the package built for your host:

| Package | Installation |
| --- | --- |
| Codex | Install from your Codex plugin marketplace, or configure this folder's `scripts/wallet-mcp.mjs` as a local MCP server using an absolute Node and script path. |
| Claude Code | Launch `claude --plugin-dir /absolute/path/ourpay-wallet`. For persistent distribution, register the built folder in your team's plugin marketplace. |
| Cursor | Copy the folder to `~/.cursor/plugins/local/ourpay-wallet`, then reload Cursor. Local plugin imports must be permitted by your organization. |
| Gemini CLI | Run `gemini extensions install /absolute/path/ourpay-wallet`. |
| GitHub Copilot CLI | Run `copilot plugin install /absolute/path/ourpay-wallet`. |
| Claude Desktop | Open the `.mcpb` bundle to install. The host must supply Node 24+. If its bundled runtime is older, configure an external Node 24 executable and the script using Developer → Edit Config. |

Ask: “Connect my OurPay account and wallet.” The owner signs in, creates or links their wallet, privately saves the initial recovery phrase if needed, and approves this agent. Sign in to the same account from each host to reuse that wallet. Fund the returned address on a supported network. Never put the recovery phrase into a chat or plugin config.

The default API is `https://api.ourpay.dev`. `OURPAY_API_URL` selects another HTTPS or loopback development API. `OURPAY_WALLET_CONNECTION_FILE` selects an alternative private connection file. Defaults are shared across local hosts on the same OS account and API endpoint, so they reuse one wallet and one revocable connection. For separate agent permissions, choose distinct private connection files or use hosted OAuth. Each connection requires owner consent.

The hosted connector is `https://mcp.ourpay.dev/wallet/mcp`. Owner approval happens at `https://wallet.ourpay.dev/wallet/connect`; no credential should be pasted into a model prompt. ChatGPT uses OAuth Dynamic Client Registration with wallet read/spend scopes and OpenID Connect disabled. Availability of custom connectors depends on the host and account settings.

Amounts use integer token base units. Quotes include slippage and fees. A transaction is complete only when confirmed; a merchant purchase requires `succeeded` and an `order_id`. Preserve request IDs when retrying. Wallets require supported assets and native gas unless a funded sponsor covers fees. See the bundled skill for the tool workflow.

Access defaults to until revoked, with optional owner deadlines. Agents can end their own access but cannot extend owner permissions. Ask the agent for a funding link when its on-chain or Hyperliquid balance is insufficient. HyperCore funds are separate from EVM and HyperEVM balances.

Download the current packages and installation guide at https://wallet.ourpay.dev/agents. These are directly distributable packages. Their creation does not mean they are listed or reviewed in public app marketplaces.
