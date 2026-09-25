# OurPay wallet integrations

Version 0.9.1 adds `ourpay_wallet_funding_sources` and `ourpay_wallet_prepare_funding`: detect existing native USDC, quote gas or mainnet Hyperliquid spot/perpetual funding, and execute it through the existing swap/owner-approval workflow. Fees come from the exact USDC input. Same-network gas uses an intermediate USDC leg with a returned continuation. Supported gasless sources are Ethereum, Optimism, Polygon, Base, Arbitrum and Avalanche; actual routes depend on provider liquidity and network configuration. Solana gas is a supported destination, but a Solana-only USDC deposit with zero SOL is not a gasless source. Unsupported assets/networks must never be described as automatically funded.

In version 0.9.1, normal mode requires owner approval for every agent payment, trade, signature and crypto-app connection. OurPay emails the account owner a signed-in review link. Spending requests return HTTP 428 with an approval ID; `ourpay_wallet_approval` tracks it. Owner approval automatically queues the exact action, and `submitted` returns the normal result ID for settlement tracking. Quotes expire and the shared daily cap still applies. Risky mode skips these per-action approvals and emails. Reads, quotes, cancellation and reconciliation of an already-authorized action do not require another confirmation. External host approval controls still apply.

Use the same 44 wallet tools from an MCP host or a model API. This release includes six native packages, 18 local client profiles (17 named clients and a generic profile), ten hosted configuration profiles, and five model tool-call formats. Models must support tools and the host must permit external integrations. A closed chat app without custom tools cannot install this wallet.

## Download and configure

Download from [OurPay integrations](https://wallet.ourpay.dev/agents). Use the complete `ourpay-wallet-integrations-0.9.1.zip`, or a native package for your host. Extract to a permanent location and use Node 24+. The archive includes its runtime dependencies. There is no published npm package to install with `npx @ourpay/agent-wallets`.

From the extracted `ourpay-wallet` directory:

```sh
node configure.mjs --list
node configure.mjs --target cursor
node configure.mjs --target codex --transport remote
node configure.mjs --target all --out ./local-configs
node configure.mjs --target all --transport remote --out ./hosted-configs
```

The generator resolves the current Node executable and bundle to absolute paths. Merge the generated `ourpay-wallet` entry into the host's existing configuration. Preserve other servers and settings. For Continue, put the generated JSON in the standalone file shown below. The generator never edits a host config or changes tool approval settings. Output directories must be new. If you move the bundle or change Node installations, regenerate the paths.

`--node`, `--bundle` and `--connection-file` accept absolute paths, including paths containing spaces. `--api-url` selects an alternate HTTPS or loopback API for local connections. Remote profiles use the production hosted endpoint.

## Native packages

| Host | Package | Install |
| --- | --- | --- |
| Codex | `ourpay-wallet-codex-0.9.1.zip` | Personal/team plugin marketplace, or the generated Codex MCP configuration |
| Claude Code | `ourpay-wallet-claude-code-0.9.1.zip` | `claude --plugin-dir /absolute/path/ourpay-wallet` |
| Cursor | `ourpay-wallet-cursor-0.9.1.zip` | Copy into `~/.cursor/plugins/local/ourpay-wallet`, then reload |
| Gemini CLI | `ourpay-wallet-gemini-cli-0.9.1.zip` | `gemini extensions install /absolute/path/ourpay-wallet` |
| GitHub Copilot CLI | `ourpay-wallet-copilot-cli-0.9.1.zip` | `copilot plugin install /absolute/path/ourpay-wallet` |
| Claude Desktop | `ourpay-wallet-claude-desktop-0.9.1.mcpb` | Open the bundle; requires a Node 24+ runtime |

Claude Desktop's managed Node version may differ from your system Node. If it cannot meet the runtime requirement, use the `claude-desktop` profile with your external Node 24 executable. Organization policies may limit local plugins. Packages are ready for local distribution; this does not imply public marketplace listing or vendor approval.

Native packages include a wallet skill/context, the server, and the host-specific manifest. Separate manifests resolve each host's plugin directory variables. Copilot uses the Agent Plugins 1.0 format. [Claude Code reference](https://code.claude.com/docs/en/plugins-reference), [Cursor reference](https://cursor.com/docs/reference/plugins), [Gemini extension reference](https://geminicli.com/docs/extensions/reference/), [Copilot plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference), [MCPB reference](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md).

## Client profiles

Checked against the linked official formats on 2026-09-25. A generated and tested launch configuration is not certification of every host version or model. `clients.json` is the machine-readable inventory.

| Target | Configuration destination | Hosted OAuth profile | Reference |
| --- | --- | --- | --- |
| `codex` | `~/.codex/config.toml` | Yes | [Codex](https://developers.openai.com/codex/mcp/) |
| `claude-code` | `.mcp.json` | Yes | [Claude Code](https://code.claude.com/docs/en/mcp) |
| `claude-desktop` | Settings → Developer → Edit Config | Use custom connector UI | [Local MCP](https://modelcontextprotocol.io/docs/develop/connect-local-servers) |
| `cursor` | `~/.cursor/mcp.json` | Yes | [Cursor](https://cursor.com/docs/context/mcp) |
| `vscode` | `.vscode/mcp.json` | Yes | [VS Code / Copilot](https://code.visualstudio.com/docs/agent-customization/mcp-servers) |
| `windsurf` | `~/.codeium/windsurf/mcp_config.json` | Yes | [Windsurf](https://docs.windsurf.com/windsurf/cascade/mcp) |
| `cline` | MCP Servers → Configure, or `~/.cline/mcp.json` | Use local profile | [Cline](https://docs.cline.bot/mcp/mcp-overview) |
| `roo-code` | `.roo/mcp.json` | Use local profile | [Roo Code](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/) |
| `continue` | `.continue/mcpServers/ourpay-wallet.json` | Use local profile | [Continue](https://docs.continue.dev/customize/deep-dives/mcp) |
| `gemini-cli` | `~/.gemini/settings.json` | Yes | [Gemini CLI](https://geminicli.com/docs/tools/mcp-server/) |
| `opencode` | `~/.config/opencode/opencode.json` | Yes | [OpenCode](https://opencode.ai/docs/mcp-servers/) |
| `kiro` | `~/.kiro/settings/mcp.json` | Yes | [Kiro IDE / CLI](https://kiro.dev/docs/mcp/configuration/) |
| `goose` | `~/.config/goose/config.yaml` | Use local profile | [Goose configuration](https://github.com/block/goose/blob/main/crates/goose/src/config/extensions.rs) |
| `zed` | `~/.config/zed/settings.json` | Yes | [Zed](https://zed.dev/docs/ai/mcp) |
| `copilot-cli` | `~/.copilot/mcp-config.json` | Use local profile | [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| `lmstudio` | Program → Install → Edit mcp.json | Use local profile | [LM Studio](https://lmstudio.ai/docs/app/mcp) |
| `kilo` | `kilo.jsonc` | Yes | [Kilo Code](https://kilo.ai/docs/automate/mcp/using-in-kilo-code) |
| `generic` | Host-specific MCP configuration | Use hosted URL if the host supports OAuth | [MCP](https://modelcontextprotocol.io/docs/develop/connect-local-servers) |

Goose's generated `.yaml` uses JSON syntax, which is valid YAML. Its server belongs under `extensions`, not `mcpServers`. Continue's agent mode can load the generated JSON directly. VS Code, Zed and OpenCode/Kilo use different root keys; don't copy another client's config unchanged.

## Hosted apps and a shared wallet

Hosted MCP URL: **https://mcp.ourpay.dev/wallet/mcp**. Choose Streamable HTTP and OAuth. Use Dynamic Client Registration and the scopes `agent_wallets:read agent_wallets:spend`; discovery supplies authorization and token endpoints. The user completes consent at OurPay. In ChatGPT custom connector setup, disable OpenID Connect in advanced settings because the API's root OIDC metadata belongs to merchant accounts. Claude's custom connector UI can use the same URL where available. Plan, admin and client support determine availability.

Owners create or recover the wallet in [OurPay](https://wallet.ourpay.dev/wallet), privately save its recovery phrase once, and approve each remote connection. A recovered wallet keeps its address and revokes old connections. Plugins never receive the phrase. Hosted clients receive revocable OAuth connections with automatically refreshed access tokens. Owner permissions default to until revoked, with optional owner-selected deadlines.

Local stdio plugins create a private connection file below `~/.config/ourpay/wallets/`. Their first `ourpay_wallet` call returns a sign-in link; they do not provision an anonymous wallet. Approve each connection while signed in to the same account to share that account's wallet with hosted ChatGPT/Claude connections. Local hosts using the same file share one grant; set separate `OURPAY_WALLET_CONNECTION_FILE` paths for independent agent permissions and revocation. Never distribute these files. Account recovery preserves wallet addresses and revokes old grants. Existing anonymous wallets can be linked using the owner's browser session or private recovery proof.

Read the supported networks from the wallet tools. Version 0.9.1 uses a $10,000 default daily USD limit shared across agents, adjustable by the owner, plus owner-only Risky mode in Advanced settings. Read `ourpay_wallet.spending` for current settings. It supports calls, spot trading, reviewed or owner-enabled automatic signing, read-only RPC and Hyperliquid exchange trading. See [the crypto capability map](PROTOCOLS.md). Read the owner policy through `ourpay_wallet_call_capabilities` before calling `ourpay_wallet_execute_calls`. Keep the same request UUID and batch ID when retrying. Permissions are enforced by OurPay; execution is not atomic. Automatic funding uses supported USDC routes and charges provider costs to the quoted USDC input; it does not give agents a free gas subsidy.

## Model APIs and custom harnesses

Import `connectWalletTools` from `./dist/wallet-tools.mjs` in the complete archive, or `@ourpay/agent-wallets/adapters` when depending on this SDK from a local source checkout. It exposes the same MCP schemas and validation; it does not copy payment logic.

```js
import { connectWalletTools } from './dist/wallet-tools.mjs'

const wallet = await connectWalletTools({
  allowTools: ['ourpay_wallet', 'ourpay_wallet_networks', 'ourpay_wallet_balance'],
})
try {
  const tools = wallet.definitions('openai-responses')
  // Supply tools to your model. Execute only the returned calls authorized by your application.
  const result = await wallet.openaiResponse({
    call_id: 'example', name: 'ourpay_wallet_networks', arguments: '{}',
  })
} finally {
  await wallet.close()
}
```

| Model API format | Definitions | Execute returned call |
| --- | --- | --- |
| OpenAI Responses | `definitions('openai-responses')` | `openaiResponse(call)` |
| OpenAI Chat Completions compatible endpoints | `definitions('openai-chat')` | `openaiChat(call)` |
| Anthropic Messages | `definitions('anthropic')` | `anthropic(toolUseBlock)` |
| Gemini / Google GenAI | `definitions('gemini')` | `gemini(functionCall)` |
| Ollama tool-capable local models | `definitions('ollama')` | `ollama(toolCall)` |

The application controls the model and its credentials. Compatibility with the Chat Completions function-tool schema can cover additional providers and local inference servers; each endpoint/model must support that schema. No model-name allowlist or automatic model substitution is used. [OpenAI functions](https://developers.openai.com/api/docs/guides/function-calling), [Anthropic tool results](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls), [Google JSON Schema declarations](https://googleapis.github.io/js-genai/release_docs/interfaces/types.FunctionDeclaration.html), [Ollama tools](https://docs.ollama.com/capabilities/tool-calling).

Responses definitions explicitly disable strict normalization so optional fee fields keep their meanings. All calls still pass through the MCP server's input validation. Result adapters retain provider call IDs and explicit error indicators. Gemini's example retains the complete model content, including thought signatures. Calls run sequentially in the examples, and no adapter automatically retries a payment or invents an idempotency key.

`allowTools` filters both advertised tools and execution; an empty array disables every tool. The examples expose wallet setup and reads only. Applications can enable transfer, swap and purchase tools when their user authorization workflow is ready. Omitting `allowTools` exposes all 47 tools under the wallet's existing backend authorization. Host/application permission checks remain the caller's responsibility.

To run a model example, install the example dependencies and provide your own model/account:

```sh
cd examples
npm install
OURPAY_MODEL=your-tool-capable-model node openai.mjs
OURPAY_MODEL=your-tool-capable-model node anthropic.mjs
OURPAY_MODEL=your-tool-capable-model node gemini.mjs
OURPAY_MODEL=your-local-model node ollama.mjs
```

Use the provider's normal `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` environment variable; don't paste keys into chat. `openai-compatible.mjs` uses a separate `OURPAY_COMPATIBLE_BASE_URL` and `OURPAY_COMPATIBLE_API_KEY`. The bounded examples make model calls only when you run them and may incur your provider's charges. No paid model call is required to generate configs or test the adapters.

For frameworks with MCP clients, connect directly to `wallet-mcp.mjs` using an absolute Node path and preserve the private connection file between runs. The `frameworks.py` examples provide MCP tool loading for OpenAI Agents SDK, LangChain/LangGraph, PydanticAI and Google ADK. Other frameworks can use their MCP client or the TypeScript adapter. Framework examples are setup recipes, not evidence of a live model run.

```sh
uv run --no-project --python 3.13 --with-requirements examples/requirements-frameworks.txt \
  python examples/frameworks.py openai
```

Replace `openai` with `langchain`, `pydantic` or `google-adk`. This command discovers tools without invoking a model or payment; starting the local server does not create a wallet or sign-in grant. In your application, keep `connect_framework(...)` open while using the returned connection: OpenAI Agents accepts `mcp_servers=[connection]`, LangChain/LangGraph accepts the returned tool list, PydanticAI accepts `toolsets=[connection]`, and ADK accepts `tools=[connection]`. Apply your application's tool filters and spending authorization before attaching all tools to an autonomous agent. [OpenAI SDK integrations](https://developers.openai.com/api/docs/guides/agents/integrations-observability), [LangChain MCP](https://docs.langchain.com/oss/python/langchain/mcp), [PydanticAI MCP](https://pydantic.dev/docs/ai/mcp/client/), [Google ADK MCP](https://adk.dev/tools-custom/mcp-tools/).

## Build and verify

From the SDK source directory:

```sh
npm ci
npm run bundle:integrations
npm run typecheck
npm test
```

Archives and SHA-256 checksums are written to `dist/releases/`. The complete extracted tree is in `dist/integrations/`. Tests launch packaged servers from paths with spaces, check all tools and private connection reuse, reject invalid/disabled model calls, and exercise provider result formats against a local API fixture. Tests do not broadcast transfers or purchase anything. Live API tests remain opt-in via the environment variables documented in the SDK README.

`npm run verify:frameworks` uses `uv` and the pinned Python 3.13 framework dependencies to load all 47 tools through each of the four real framework clients against a local API fixture. Set `OURPAY_OPENCODE_BIN` to an installed OpenCode executable to also check its native MCP connection in an isolated configuration directory. It makes no model calls and uses no real wallet. The Codex and Claude Code plugin validators, MCPB validator and Agent Plugins 1.0 JSON schemas provide additional manifest checks; host UIs and live model behavior require separate verification on those clients.

## Multichain assets

All formats expose the same 47 tools, including `ourpay_wallet_addresses`, `ourpay_wallet_assets` and `ourpay_wallet_convert`. Transfer/swap amounts remain integer base-unit strings; Hyperliquid order sizes and prices use human-unit decimal strings. Discover the chain family, native asset, decimals and execution availability before spending. EVM and Solana use different public addresses derived from one recovery phrase. See [the capability map](PROTOCOLS.md) for routing, gas and protocol limits.

### Perpetuals and standing limit orders

All distributions include the eight exchange tools: capabilities, market discovery, account state, place order, order status, recent orders, cancellation and fills. Read `ourpay_wallet_exchange_capabilities` first; shared wallet settings apply unless an earlier custom grant still restricts the connection; the separate HyperCore account must be funded. GTC/post-only orders and isolated perpetual positions are supported. See [exchange trading](PROTOCOLS.md#exchange-trading-hyperliquid) for decimal units, retry identity, funding and cancellation limits. Refresh hosted tool discovery or restart the local host after upgrading.
