import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { AgentWalletClient } from './client.js'

type ToolResult = (operation: () => Promise<unknown>) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
const spending = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
const amount = z.string().regex(/^[1-9][0-9]{0,77}$/)

export function registerTradeTools(server: McpServer, client: AgentWalletClient, result: ToolResult) {
  server.registerTool('ourpay_wallet_trading_capabilities', {
    description: 'Read the owner-authorized trading pairs, per-trade and cumulative sell budgets, slippage cap, expiry and reserved fees for this connection. A null policy uses the shared daily USD limit or owner-enabled Risky mode returned by ourpay_wallet. Agents cannot grant themselves trading authority. Trading-only sessions cannot transfer, purchase or execute arbitrary calls. Limits are enforced by OurPay, not on-chain session keys. Supported orders are same-chain exact-input spot trades through verified LI.FI routes.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.tradingCapabilities()))
  server.registerTool('ourpay_wallet_quote_trade', {
    description: 'Quote buying one crypto asset by selling an exact amount of another in the same wallet. Use networks to identify configured tokens; zero address means the native asset, such as ETH. All amounts are integer base units, not USD. Supply a meaningful min_buy_amount, explicit fee cap and one UUID reused on retries. The server verifies the actual route calldata, recipient, assets, input and minimum output against the request and owner policy. No funds are spent by quoting. Unsupported routes are rejected; never bypass rejection with unrestricted signing.',
    inputSchema: z.object({ idempotency_key: z.string().uuid(), chain_id: z.number().int().positive(), sell_token: address, buy_token: address, sell_amount: amount, min_buy_amount: amount, slippage_bps: z.number().int().min(0).max(500).optional(), max_network_fee: amount }), annotations: { ...readOnly, readOnlyHint: false },
  }, (data) => result(() => client.quoteTrade(data)))
  server.registerTool('ourpay_wallet_execute_trade', {
    description: 'Execute or resume an existing authorized trade. Reserves the session budget once, approves exact amounts and simulates before signing and first submission. Up to three per-transaction fee caps are reserved for ERC20 trades, one for native input. Revocation, expiry and pause stop further submissions. Failed or uncertain attempts retain reservations. Reuse the same trade_id after timeouts and read trade status until swap.status is confirmed; approvals alone do not mean a trade filled.',
    inputSchema: z.object({ trade_id: z.string().uuid() }), annotations: spending,
  }, ({ trade_id }) => result(() => client.executeTrade(trade_id)))
  server.registerTool('ourpay_wallet_trade', {
    description: 'Read an existing trade and its original transaction IDs. Only swap.status=confirmed means delivery was verified from the canonical receipt. received_amount is the verified output in base units. needs_attention requires review; do not create a replacement order automatically.',
    inputSchema: z.object({ trade_id: z.string().uuid() }), annotations: readOnly,
  }, ({ trade_id }) => result(() => client.trade(trade_id)))
  server.registerTool('ourpay_wallet_trades', {
    description: 'Read recent trades and pending executions for the wallet.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.trades()))
}
