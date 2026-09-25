import { Client, InMemoryTransport, type CallToolResult, type Tool } from '@modelcontextprotocol/client'
import { AgentWalletClient } from './client.js'
import { loadConnection } from './connection.js'
import { createWalletMCP } from './mcp.js'

export type ToolFormat = 'openai-responses' | 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'
type Arguments = Record<string, unknown>

const failure = (message: string): CallToolResult => ({
  isError: true, content: [{ type: 'text', text: message }],
})
const textResult = (result: CallToolResult) => JSON.stringify({
  isError: result.isError === true, content: result.content,
})

export class WalletToolSession {
  private constructor(
    private readonly client: Client,
    private readonly server: ReturnType<typeof createWalletMCP>,
    private readonly tools: Tool[],
  ) {}

  static async create(wallet: AgentWalletClient, options: { allowTools?: readonly string[] } = {}) {
    const server = createWalletMCP(wallet)
    const client = new Client({ name: 'OurPay model adapter', version: '0.9.1' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    try {
      await server.connect(serverTransport)
      await client.connect(clientTransport)
      const { tools } = await client.listTools()
      for (const name of options.allowTools ?? []) {
        if (!tools.some(tool => tool.name === name)) throw new Error(`Unknown OurPay tool: ${name}`)
      }
      return new WalletToolSession(client, server,
        tools.filter(tool => options.allowTools === undefined || options.allowTools.includes(tool.name)))
    } catch (error) {
      await client.close()
      await server.close()
      throw error
    }
  }

  definitions(format: 'openai-responses'): Array<{ type: 'function'; name: string; description: string; parameters: Tool['inputSchema']; strict: false }>
  definitions(format: 'openai-chat' | 'ollama'): Array<{ type: 'function'; function: { name: string; description: string; parameters: Tool['inputSchema'] } }>
  definitions(format: 'anthropic'): Array<{ name: string; description: string; input_schema: Tool['inputSchema'] }>
  definitions(format: 'gemini'): Array<{ functionDeclarations: Array<{ name: string; description: string; parametersJsonSchema: Tool['inputSchema'] }> }>
  definitions(format: ToolFormat): unknown[]
  definitions(format: ToolFormat): unknown[] {
    const functions = this.tools.map(tool => ({
      name: tool.name, description: tool.description ?? '', parameters: structuredClone(tool.inputSchema),
    }))
    switch (format) {
      case 'openai-responses': return functions.map(tool => ({ type: 'function', ...tool, strict: false }))
      case 'openai-chat':
      case 'ollama': return functions.map(tool => ({ type: 'function', function: tool }))
      case 'anthropic': return functions.map(({ parameters, ...tool }) => ({ ...tool, input_schema: parameters }))
      case 'gemini': return functions.length ? [{ functionDeclarations: functions.map(({ parameters, ...tool }) => ({ ...tool, parametersJsonSchema: parameters })) }] : []
      default: throw new Error(`Unsupported tool format: ${format}`)
    }
  }

  async call(name: string, args: unknown = {}): Promise<CallToolResult> {
    if (!this.tools.some(tool => tool.name === name)) return failure('This wallet tool is not enabled for this session.')
    if (!args || typeof args !== 'object' || Array.isArray(args)) return failure('Tool arguments must be a JSON object.')
    try {
      return await this.client.callTool({ name, arguments: args as Arguments })
    } catch {
      return failure('The tool call was rejected or interrupted. Check its arguments and retry with the same request ID.')
    }
  }

  private async callJSON(name: string, args: string) {
    let parsed: unknown
    try { parsed = JSON.parse(args) } catch { return failure('Tool arguments are not valid JSON.') }
    return this.call(name, parsed)
  }

  async openaiResponse(call: { name: string; arguments: string; call_id: string }) {
    return { type: 'function_call_output' as const, call_id: call.call_id, output: textResult(await this.callJSON(call.name, call.arguments)) }
  }

  async openaiChat(call: { id: string; function: { name: string; arguments: string } }) {
    return { role: 'tool' as const, tool_call_id: call.id, content: textResult(await this.callJSON(call.function.name, call.function.arguments)) }
  }

  async anthropic(call: { id: string; name: string; input: unknown }) {
    const result = await this.call(call.name, call.input)
    return { type: 'tool_result' as const, tool_use_id: call.id, is_error: result.isError === true, content: textResult(result) }
  }

  async gemini(call: { id?: string; name: string; args?: Arguments }) {
    const result = await this.call(call.name, call.args ?? {})
    return { functionResponse: {
      ...(call.id ? { id: call.id } : {}), name: call.name,
      response: { isError: result.isError === true, content: result.content },
    } }
  }

  async ollama(call: { function: { name: string; arguments: Arguments } }) {
    return { role: 'tool' as const, tool_name: call.function.name, content: textResult(await this.call(call.function.name, call.function.arguments)) }
  }

  async close() {
    try { await this.client.close() } finally { await this.server.close() }
  }
}

export async function connectWalletTools(options: {
  apiURL?: string; connectionFile?: string; allowTools?: readonly string[]
} = {}) {
  const wallet = await loadConnection(
    options.apiURL ?? process.env.OURPAY_API_URL ?? 'https://api.ourpay.dev',
    options.connectionFile ?? process.env.OURPAY_WALLET_CONNECTION_FILE,
  )
  return WalletToolSession.create(wallet, options)
}
