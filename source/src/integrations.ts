import { isAbsolute } from 'node:path'
import { validateAPIURL } from './client.js'

export const remoteMCPURL = 'https://mcp.ourpay.dev/wallet/mcp'
export const integrations = [
  { id: 'codex', name: 'Codex', destination: '~/.codex/config.toml', source: 'https://developers.openai.com/codex/mcp/', remote: true },
  { id: 'claude-code', name: 'Claude Code', destination: '.mcp.json', source: 'https://code.claude.com/docs/en/mcp', remote: true },
  { id: 'claude-desktop', name: 'Claude Desktop', destination: 'Settings → Developer → Edit Config', source: 'https://modelcontextprotocol.io/docs/develop/connect-local-servers', remote: false },
  { id: 'cursor', name: 'Cursor', destination: '~/.cursor/mcp.json', source: 'https://cursor.com/docs/context/mcp', remote: true },
  { id: 'vscode', name: 'VS Code / GitHub Copilot', destination: '.vscode/mcp.json', source: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers', remote: true },
  { id: 'windsurf', name: 'Windsurf', destination: '~/.codeium/windsurf/mcp_config.json', source: 'https://docs.windsurf.com/windsurf/cascade/mcp', remote: true },
  { id: 'cline', name: 'Cline', destination: 'MCP Servers → Configure MCP Servers, or ~/.cline/mcp.json', source: 'https://docs.cline.bot/mcp/mcp-overview', remote: false },
  { id: 'roo-code', name: 'Roo Code', destination: '.roo/mcp.json', source: 'https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/', remote: false },
  { id: 'continue', name: 'Continue', destination: '.continue/mcpServers/ourpay-wallet.json', source: 'https://docs.continue.dev/customize/deep-dives/mcp', remote: false },
  { id: 'gemini-cli', name: 'Gemini CLI', destination: '~/.gemini/settings.json', source: 'https://geminicli.com/docs/tools/mcp-server/', remote: true },
  { id: 'opencode', name: 'OpenCode', destination: '~/.config/opencode/opencode.json', source: 'https://opencode.ai/docs/mcp-servers/', remote: true },
  { id: 'kiro', name: 'Kiro IDE / CLI', destination: '~/.kiro/settings/mcp.json', source: 'https://kiro.dev/docs/mcp/configuration/', remote: true },
  { id: 'goose', name: 'Goose', destination: '~/.config/goose/config.yaml', source: 'https://github.com/block/goose/blob/main/crates/goose/src/config/extensions.rs', remote: false },
  { id: 'zed', name: 'Zed', destination: '~/.config/zed/settings.json', source: 'https://zed.dev/docs/ai/mcp', remote: true },
  { id: 'copilot-cli', name: 'GitHub Copilot CLI', destination: '~/.copilot/mcp-config.json', source: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers', remote: false },
  { id: 'lmstudio', name: 'LM Studio', destination: 'Program → Install → Edit mcp.json', source: 'https://lmstudio.ai/docs/app/mcp', remote: false },
  { id: 'kilo', name: 'Kilo Code', destination: 'kilo.jsonc', source: 'https://kilo.ai/docs/automate/mcp/using-in-kilo-code', remote: true },
  { id: 'generic', name: 'Generic MCP client', destination: 'Client-specific MCP configuration', source: 'https://modelcontextprotocol.io/docs/develop/connect-local-servers', remote: false },
] as const

export type IntegrationID = typeof integrations[number]['id']
export interface ConfigurationOptions {
  bundlePath: string
  nodePath: string
  apiURL?: string
  connectionFile?: string
  transport?: 'stdio' | 'remote'
}

export function renderConfiguration(id: string, options: ConfigurationOptions): { extension: string; content: string } {
  const target = integrations.find(item => item.id === id)
  if (!target) throw new Error(`Unknown integration: ${id}`)
  const remote = options.transport === 'remote'
  if (remote && !target.remote) throw new Error(`${target.name}: use the local MCP bundle or the hosted connector instructions.`)
  if (!isAbsolute(options.bundlePath)) throw new Error('The MCP bundle path must be absolute.')
  if (!isAbsolute(options.nodePath)) throw new Error('The Node executable path must be absolute.')
  if (options.connectionFile && !isAbsolute(options.connectionFile)) throw new Error('The wallet connection file path must be absolute.')
  const env = {
    OURPAY_API_URL: validateAPIURL(options.apiURL ?? 'https://api.ourpay.dev'),
    ...(options.connectionFile ? { OURPAY_WALLET_CONNECTION_FILE: options.connectionFile } : {}),
  }
  const local = { command: options.nodePath, args: [options.bundlePath], env }
  const server = remote ? { url: remoteMCPURL } : local
  let config: unknown
  switch (id) {
    case 'goose': return { extension: 'yaml', content: `${JSON.stringify({ extensions: { ourpaywallet: {
      enabled: true, type: 'stdio', name: 'ourpay-wallet', description: 'OurPay wallet tools',
      cmd: local.command, args: local.args, envs: env, timeout: 60,
    } } }, null, 2)}\n` }
    case 'codex': return {
      extension: 'toml', content: remote
        ? `[mcp_servers.ourpay-wallet]\nurl = ${JSON.stringify(remoteMCPURL)}\n`
        : `[mcp_servers.ourpay-wallet]\ncommand = ${JSON.stringify(local.command)}\nargs = ${JSON.stringify(local.args)}\n\n[mcp_servers.ourpay-wallet.env]\n${Object.entries(env).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n')}\n`,
    }
    case 'vscode': config = { servers: { 'ourpay-wallet': { type: remote ? 'http' : 'stdio', ...server } } }; break
    case 'opencode':
    case 'kilo': config = { mcp: { 'ourpay-wallet': remote
      ? { type: 'remote', url: remoteMCPURL, enabled: true, timeout: 60000 }
      : { type: 'local', command: [local.command, ...local.args], environment: env, enabled: true, timeout: 60000 } } }; break
    case 'zed': config = { context_servers: { 'ourpay-wallet': server } }; break
    case 'gemini-cli': config = { mcpServers: { 'ourpay-wallet': remote ? { httpUrl: remoteMCPURL } : local } }; break
    case 'windsurf': config = { mcpServers: { 'ourpay-wallet': remote ? { serverUrl: remoteMCPURL } : local } }; break
    case 'claude-code': config = { mcpServers: { 'ourpay-wallet': { type: remote ? 'http' : 'stdio', ...server } } }; break
    case 'copilot-cli': config = { mcpServers: { 'ourpay-wallet': { type: 'local', ...local, tools: ['*'] } } }; break
    default: config = { mcpServers: { 'ourpay-wallet': server } }
  }
  return { extension: 'json', content: `${JSON.stringify(config, null, 2)}\n` }
}
