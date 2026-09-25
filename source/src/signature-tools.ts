import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { AgentWalletClient } from './client.js'

export interface SignatureRequest {
  dapp_connection_id?: string
  idempotency_key: string
  chain_id: number
  method: 'personal_sign' | 'eth_signTypedData_v4'
  payload: Record<string, unknown>
  expires_at: string
}

export interface WalletSignature extends SignatureRequest {
  id: string
  credential_id: string
  status: 'pending' | 'signed' | 'rejected'
  message_hash: string
  signed_at: string | null
  signature: string | null
  owner_approval_url: string
}

type ToolResult = (operation: () => Promise<unknown>) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>

export function registerSignatureTools(server: McpServer, client: AgentWalletClient, result: ToolResult) {
  server.registerTool('ourpay_wallet_request_signature', {
    description: 'Sign an exact message or EIP-712 payload. With Risky mode off, every signing request waits for owner review, including login messages for connected apps. OurPay emails the owner; show owner_approval_url and poll ourpay_wallet_signature. With owner-enabled Risky mode, supported messages and typed data sign immediately without another confirmation or approval email. Include dapp_connection_id only for an active app grant; scoped personal_sign requires ERC-4361 with matching origin/address/chain and valid timestamps. Otherwise omit it for exact-payload review. The personal_sign payload is {message: "0x<UTF-8 bytes>"}. Typed data must bind domain.chainId. Issued signatures may spend assets outside daily limits and outlive revocation. Keep the same UUID across retries. If Risky mode was enabled while pending, resubmit the identical request to sign it automatically. Never invent owner approval.',
    inputSchema: z.object({ dapp_connection_id: z.string().uuid().optional(), idempotency_key: z.string().uuid(), chain_id: z.number().int().positive(), method: z.enum(['personal_sign', 'eth_signTypedData_v4']), payload: z.record(z.string(), z.unknown()), expires_at: z.string().datetime({ offset: true }) }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, data => result(() => client.requestSignature(data)))
  server.registerTool('ourpay_wallet_signature', {
    description: 'Read this connection’s signing request. pending requires owner review; rejected is final. signed returns the signature for the exact approved payload, not a private key. Do not claim a protocol order filled just because it was signed; submit and verify through that protocol. Expiry limits the approval window, not the validity of an already issued signature.',
    inputSchema: z.object({ signature_id: z.string().uuid() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ signature_id }) => result(() => client.signature(signature_id)))
  server.registerTool('ourpay_wallet_rpc', {
    description: 'Read configured EVM or Solana chain state: contract views, token/NFT balances and allowances, positions, logs, gas estimates, receipts and code. This endpoint cannot sign or submit transactions. Decode results with the protocol’s verified ABI and use owner-authorized execute_calls for changes. Use the method and quantities for the selected network family; Solana addresses are case-sensitive.',
    inputSchema: z.object({ chain_id: z.number().int().positive(), method: z.enum(['eth_blockNumber', 'eth_getBalance', 'eth_getCode', 'eth_getStorageAt', 'eth_call', 'eth_estimateGas', 'eth_gasPrice', 'eth_getTransactionCount', 'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_getBlockByNumber', 'eth_getBlockByHash', 'eth_getLogs', 'getBalance', 'getTokenAccountsByOwner', 'getTokenAccountBalance', 'getTokenSupply', 'getAccountInfo', 'getMultipleAccounts', 'getTransaction', 'getSignatureStatuses', 'getLatestBlockhash', 'getBlockHeight', 'getSlot', 'getGenesisHash']), params: z.array(z.unknown()).max(5).optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, data => result(() => client.rpc(data.chain_id, data.method, data.params ?? [])))
}
