import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse } from '@modelcontextprotocol/server'
import { AgentWalletClient, WalletAPIError, validateAPIURL } from './client.js'
import { createWalletMCP } from './mcp.js'

export interface RemoteWalletConfig {
  apiURL: string
  resourceURL: string
  allowedHosts?: string[]
  allowedOriginHosts?: string[]
}

const scopes = ['agent_wallets:read', 'agent_wallets:spend']

export async function handleWalletMCP(request: Request, config: RemoteWalletConfig): Promise<Response> {
  const resource = new URL(validateAPIURL(config.resourceURL))
  const apiURL = validateAPIURL(config.apiURL)
  const rejected = hostHeaderValidationResponse(request, [resource.hostname, ...(config.allowedHosts ?? [])])
    ?? originValidationResponse(request, [resource.hostname, new URL(apiURL).hostname, ...(config.allowedOriginHosts ?? [])])
  if (rejected) return rejected
  const url = new URL(request.url)
  const metadataURL = `${resource.origin}/.well-known/oauth-protected-resource${resource.pathname}`
  if (url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === `/.well-known/oauth-protected-resource${resource.pathname}`) {
    return Response.json({
      resource: config.resourceURL, resource_name: 'OurPay Wallet',
      authorization_servers: [`${apiURL}/v1/agent-wallets/oauth`], scopes_supported: scopes,
      bearer_methods_supported: ['header'],
    }, { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' } })
  }
  if (url.pathname === '/healthz') return Response.json({ status: 'ok', service: 'OurPay Wallet MCP' })
  if (url.pathname !== resource.pathname) return Response.json({ error: 'not_found' }, { status: 404 })
  const corsHeaders: Record<string, string> = request.headers.get('origin') ? {
    'Access-Control-Allow-Origin': request.headers.get('origin')!,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID',
    'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Session-Id, MCP-Protocol-Version',
    Vary: 'Origin',
  } : {}
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  const unauthorized = () => Response.json({ error: 'unauthorized' }, {
    status: 401, headers: { ...corsHeaders, 'WWW-Authenticate': `Bearer resource_metadata="${metadataURL}", scope="${scopes.join(' ')}"`, 'Cache-Control': 'no-store' },
  })
  const token = /^Bearer (ourpay_aw_[A-Za-z0-9_-]{43,128})$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token) return unauthorized()
  const client = new AgentWalletClient({ apiURL, token })
  try {
    const authorization = await client.connector()
    if (authorization.resource !== config.resourceURL || scopes.some(scope => !authorization.scopes.includes(scope))) return unauthorized()
  } catch (error) {
    if (error instanceof WalletAPIError && [401, 403].includes(error.status)) return unauthorized()
    return Response.json({ error: 'temporarily_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  const handler = createMcpHandler(() => createWalletMCP(client, { provision: false }), { legacy: 'stateless', responseMode: 'auto' })
  const response = await handler.fetch(request)
  response.headers.set('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(corsHeaders)) response.headers.set(name, value)
  return response
}
