import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import type { AgentWalletClient } from './client.js'

export interface DappConnection {
  id: string; credential_id: string; origin: string; chain_ids: number[]
  approved_by_id: string | null; allow_sign_in: boolean
  typed_data_rules: Array<{ domain: Record<string, unknown>; primary_type: string }>
  max_signatures: number; signed_count: number; connected: boolean
  expires_at: string | null; revoked_at: string | null; owner_approval_url: string
}
type Result = (operation: () => Promise<unknown>) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
export function registerDappTools(server: McpServer, client: AgentWalletClient, result: Result) {
  server.registerTool('ourpay_wallet_connect_dapp', {
    description: 'Connect this account-owned wallet to an exact HTTPS crypto-app origin and EVM chain IDs. With Risky mode off, OurPay emails the owner a review link for a new app connection; all normal-mode signatures need separate approval. Risky mode authorizes supported app connections and signing automatically. Read the returned scope; approved and connected are required to use this grant. Use dapp_connection_id with request_signature. An app cannot grant itself permission. A prior owner grant can reconnect until expiry, but revoked grants require a new agent connection.',
    inputSchema: z.object({ origin: z.string().url().max(2048), chain_ids: z.array(z.number().int().positive()).min(1).max(50) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ origin, chain_ids }) => result(() => client.connectDapp(origin, chain_ids)))
  server.registerTool('ourpay_wallet_dapps', {
    description: 'Read this agent’s crypto-app connections and the exact owner-delegated sign-in or EIP-712 domains, signature count and expiry. A connection grant is not an order fill or permission to expand scope.',
    inputSchema: z.object({}), annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, () => result(() => client.dapps()))
  server.registerTool('ourpay_wallet_disconnect_dapp', {
    description: 'Disconnect an existing crypto-app session, stopping new delegated signatures until explicitly reconnected. This does not cancel orders, remove on-chain approvals, invalidate issued signatures, or erase the owner’s reusable grant. The owner can revoke that grant in OurPay.',
    inputSchema: z.object({ dapp_connection_id: z.string().uuid() }), annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ dapp_connection_id }) => result(async () => { await client.disconnectDapp(dapp_connection_id); return { disconnected: true } }))
}
