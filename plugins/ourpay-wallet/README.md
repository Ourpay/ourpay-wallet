# OurPay Wallet plugin

Connect an AI agent to the owner's existing OurPay account wallet. SDK 0.9.6 includes **52 MCP tools** for wallet discovery, funding, transfers, conversions, merchant purchases, simulated EVM calls, signatures, app connections and Hyperliquid trading. Agents never receive the recovery phrase.

[Open wallet](https://wallet.ourpay.dev/wallet) · [Download packages](https://wallet.ourpay.dev/agents) · [Public repository](https://github.com/Ourpay/ourpay-wallet)

## Install and connect

Use Node.js 24 or newer for local packages. The packaged server includes its runtime dependencies. Do not install an unrelated npm package with the same name.

| Host | Package/use |
| --- | --- |
| Codex | Install the OurPay repository marketplace/plugin, or use a generated MCP configuration |
| Claude Code | Install the OurPay marketplace plugin, or use `claude --plugin-dir /absolute/path/ourpay-wallet` |
| Cursor | Use the Cursor package/local plugin directory and reload; public listing is separate |
| Gemini CLI | Install the repository or extracted extension with `gemini extensions install` |
| Copilot CLI | Install the repository/extracted portable Agent Plugin |
| Claude Desktop | Open the `.mcpb` bundle; use an external Node 24+ configuration if the managed runtime is older |
| Other compatible hosts | Use the complete integrations bundle's host configuration generator or the hosted OAuth endpoint |

For a hosted OAuth connector, use **`https://mcp.ourpay.dev/wallet/mcp`**. `/mcp` is a different merchant service. Follow the OurPay sign-in link and approve this connection to the same account used in your wallet browser. See [full integration instructions](skills/ourpay-wallet/references/INTEGRATIONS.md).

The first local `ourpay_wallet` call returns setup/consent when needed. A private connection file is saved below `~/.config/ourpay/wallets/`; preserve it across restarts and never share it. Different files allow independently revocable connections. No recovery phrase, merchant API key or model-provider credential is needed by the wallet MCP server.

## First read-only check

Ask your agent:

> Call `ourpay_wallet_guide` with topic `overview`, then read my OurPay wallet and supported networks. Do not sign, transfer or trade.

The guide covers `permissions`, `funding`, `transfers`, `swaps`, `purchases`, `hyperliquid` and `dapps`, or `all`. If the host still exposes an older catalog, restart its MCP connection; local installations also need the current executable. Keep your existing wallet and credential. [Troubleshooting](skills/ourpay-wallet/references/TROUBLESHOOTING.md).

## Owner controls

Standard mode requires owner review for new payments, trades, signatures, contract submissions and app connections. OurPay emails a review link and returns an approval URL to the agent. The default $10,000 daily USD allowance is shared across agents and resets at 00:00 UTC; only the owner can change it.

Owner-enabled Risky mode skips supported per-action approval and shared budget restrictions. Pause, revocation, supported networks and venue validation still apply. It does not supply a strategy or authorize actions outside the user's task. Permissions can last until revoked; individual quotes and signatures still expire.

The owner can view the recovery phrase in wallet Settings after recent sign-in. Plugins cannot retrieve it. Account recovery retains addresses and revokes old connections.

## Packaged documentation

- [Owner guide](skills/ourpay-wallet/references/USER_GUIDE.md): setup, screens, funds, controls and recovery.
- [Workflows](skills/ourpay-wallet/references/WORKFLOWS.md): exact units, approvals, multi-leg funding, execution and retries.
- [Protocol guide](skills/ourpay-wallet/references/PROTOCOLS.md): supported capabilities and boundaries, including Hyperliquid and WalletConnect.
- [Complete tool reference](skills/ourpay-wallet/references/TOOLS.md): all 52 tools and complete input schemas.
- [Integration guide](skills/ourpay-wallet/references/INTEGRATIONS.md): all host profiles, model formats and framework examples.
- [Troubleshooting](skills/ourpay-wallet/references/TROUBLESHOOTING.md): stale catalogs, funding failures and uncertain outcomes.
- [Testing](skills/ourpay-wallet/references/TESTING.md): what fixture, testnet and live checks actually establish.
- [Agent skill](skills/ourpay-wallet/SKILL.md): task-oriented instructions loaded by supported hosts.

Tagged releases are fixed snapshots. Updated repository documentation does not modify an already installed executable or automatically refresh its host's catalog. Repository packages and generated profiles do not imply vendor marketplace approval.
