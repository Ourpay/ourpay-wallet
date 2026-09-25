import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import type { AgentWalletClient } from './client.js'

export interface FundingCapabilities {
  enabled: boolean
  sources: { chain_id: number; name: string; token: string; balance: string | null; available: boolean }[]
  destination_chains: number[]
  destinations: string[]
  instructions: string[]
}
export interface FundingQuoteRequest {
  idempotency_key: string
  destination: 'gas' | 'usdc' | 'hyperliquid_perpetuals' | 'hyperliquid_spot'
  chain_id?: number
  from_chain_id?: number
  from_amount: string
  minimum_received?: string
  max_fee_bps?: number
  slippage_bps?: number
}

export interface WalletFunding {
  destination: 'wallet' | 'hyperliquid'; network: string; testnet: boolean
  address: string; symbol: string; decimals: number; amount_unit: 'base_units' | 'USDC'
  available_amount: string; minimum_balance: string; shortfall: string
  status: 'funded' | 'awaiting_funds'; native_amount: string | null
  native_symbol: string | null; native_decimals: number | null
  owner_url: string; app_url: string | null; instructions_url: string | null
  instructions: string[]; observed_at: string
}
type Result = (operation: () => Promise<unknown>) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }

export function registerFundingTools(server: McpServer, client: AgentWalletClient, result: Result) {
  server.registerTool('ourpay_wallet_funding_sources', {
    description: 'Find this wallet’s native USDC across enabled gasless source networks. Check this before asking the user for separate gas or Hyperliquid deposits. Prepare required gas before starting ordinary swaps, calls or purchases. Null balances mean unavailable reads, not zero. Gasless routes spend USDC inclusive of provider fees and deliver gas, USDC, or Hyperliquid mainnet spot/perpetual collateral to this same wallet. Other assets use ordinary swap routes when source gas is available.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.fundingCapabilities()))
  server.registerTool('ourpay_wallet_prepare_funding', {
    description: 'Prepare gas or Hyperliquid collateral from one existing USDC top-up. No funds move when quoting. from_amount is exact USDC input INCLUDING fees in 6-decimal base units. Omit from_chain_id to detect the source. Set chain_id only for gas/usdc destinations; Hyperliquid destinations are mainnet HyperCore (output uses 8 decimals). Minimum_received uses destination base units. Inspect fees, then execute the returned swap ID with ourpay_wallet_execute_swap and poll that SAME ID until confirmed. Normal mode sends the exact quote for owner approval; Risky mode needs no OurPay per-action approval. If funding.continuation is present, this is the first leg of same-network gas preparation: after confirmation, call this tool with that continuation, a new idempotency key and from_amount equal to received_amount, execute and wait again. Only then continue the original authorized task. Do not ask the owner to manually buy gas or deposit into Hyperliquid when this route is available. Never replace an uncertain submitted route.',
    inputSchema: z.object({ idempotency_key: z.uuid(), destination: z.enum(['gas', 'usdc', 'hyperliquid_perpetuals', 'hyperliquid_spot']), chain_id: z.number().int().positive().optional(), from_chain_id: z.number().int().positive().optional(), from_amount: z.string().regex(/^[1-9][0-9]{0,77}$/), minimum_received: z.string().regex(/^[1-9][0-9]{0,77}$/).optional(), max_fee_bps: z.number().int().min(0).max(2500).optional(), slippage_bps: z.number().int().min(0).max(500).optional() }),
    annotations: { ...readOnly, readOnlyHint: false, idempotentHint: true },
  }, (input) => result(() => client.quoteFunding(input)))
  server.registerTool('ourpay_wallet_request_funding', {
    description: 'Ask the owner to top up an exact asset on an enabled EVM or Solana network. Provide the total required balance in integer base units. Returns the current balance, shortfall, correct funding address, instructions and owner_url to show the user. Reads only; it never transfers funds or sends a notification. Recheck after the owner funds, including native gas and permissions, before resuming the original authorized task.',
    inputSchema: z.object({ chain_id: z.number().int().positive(), token: z.string().regex(/^(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/), minimum_balance: z.string().regex(/^[1-9][0-9]{0,77}$/) }), annotations: readOnly,
  }, ({ chain_id, token, minimum_balance }) => result(() => client.requestFunding(chain_id, token, minimum_balance)))
  server.registerTool('ourpay_wallet_exchange_funding', {
    description: 'Read the Hyperliquid funding shortfall for this wallet address. Inspect existing wallet USDC with ourpay_wallet_funding_sources first; use ourpay_wallet_prepare_funding for mainnet deposits before requesting another owner top-up. Specify mainnet/testnet, the total required USDC balance as a decimal string and perpetuals or spot. Returns free collateral/balance, exact shortfall and an owner funding link. Show its instructions: HyperCore funds are separate from EVM/HyperEVM balances. This does not deposit, withdraw, transfer collateral or trade. After funding, recheck exchange balance and permissions before resuming the authorized order.',
    inputSchema: z.object({ network: z.enum(['mainnet', 'testnet']), minimum_balance: z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/).max(80), account: z.enum(['perpetuals', 'spot']).optional() }), annotations: readOnly,
  }, ({ network, minimum_balance, account }) => result(() => client.exchangeFunding(network, minimum_balance, account)))
  server.registerTool('ourpay_wallet_end_session', {
    description: 'End this agent’s wallet access when the owner asks or the delegated task is complete. Revokes this connection and its app grants and requests cancellation of its pending exchange orders. Positions, already-issued signatures and on-chain approvals remain. Access otherwise lasts until revoked or an owner-selected expiry. The agent cannot extend owner permissions. Reconnecting requires new owner consent.',
    inputSchema: z.object({}), annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, () => result(async () => { await client.endSession(); return { disconnected: true } }))
}
