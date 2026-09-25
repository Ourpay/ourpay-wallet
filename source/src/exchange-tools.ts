import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { AgentWalletClient } from './client.js'

type ToolResult = (operation: () => Promise<unknown>) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const spending = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
const network = z.enum(['mainnet', 'testnet'])
const amount = z.string().regex(/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,18})?$/).max(38)

export function registerExchangeTools(server: McpServer, client: AgentWalletClient, result: ToolResult) {
  server.registerTool('ourpay_wallet_exchange_capabilities', {
    description: 'Read Hyperliquid trading permissions for this connection. With no custom policy, orders use the wallet-wide daily USD limit (reference notional plus reserved fees), or owner-enabled Risky mode. Existing custom policies remain until the owner saves shared settings. Permissions stay active until revoked when expiry is absent. Agents cannot grant themselves permission. Notional budgets count attempts and are not loss limits. Liquidation and funding costs remain possible. Expiry, pause and revocation request cancellation; venue orders can fill until cancellation is acknowledged, and positions stay open.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.exchangeCapabilities()))
  server.registerTool('ourpay_wallet_exchange_markets', {
    description: 'Discover live Hyperliquid default perpetual markets and USDC-quoted spot pairs, exact market IDs, size decimals, mark prices, funding rates and maximum leverage. These are exchange assets, not EVM token addresses. Use the returned ID such as perp:BTC or spot:@107. A listed market still needs liquidity and owner permission. HIP-3 markets are not supported.',
    inputSchema: z.object({ network, search: z.string().max(80).optional(), limit: z.number().int().min(1).max(500).optional() }), annotations: readOnly,
  }, ({ network, search, limit }) => result(() => client.exchangeMarkets(network, search, limit)))
  server.registerTool('ourpay_wallet_exchange_account', {
    description: 'Read Hyperliquid positions, margin, liquidation prices, unrealized PnL, spot balances and open orders for this wallet address. HyperCore exchange funds are separate from on-chain EVM/Solana and HyperEVM HYPE balances. Before requesting a separate top-up, use ourpay_wallet_funding_sources and ourpay_wallet_prepare_funding to fund mainnet spot/perpetual USDC from existing wallet funds. Recheck this account after funding is confirmed. Withdrawals and internal collateral transfers remain unsupported. Never request a recovery phrase.',
    inputSchema: z.object({ network }), annotations: readOnly,
  }, ({ network }) => result(() => client.exchangeAccount(network)))
  server.registerTool('ourpay_wallet_place_order', {
    description: 'Place an owner-authorized Hyperliquid spot or isolated perpetual order. Decimal size and price are human token units, not integer base units. Buy/sell opens long/short; reduce_only closes an existing position. limit uses Gtc or Alo (post-only); market uses IOC with limit_price as the worst acceptable price and may partially fill or not fill. Trigger/stop orders are not supported. Respect returned size/price precision and leverage limits. Reuse one UUID and identical inputs across retries. Omit expires_at or use null for a standing order until canceled. Set it only when the user task needs a deadline, within any owner expiry. It is OurPay cancellation time, not a venue-enforced lifetime. Read status; queued/open is not filled. Never replace an uncertain order automatically. Read ourpay_wallet for current shared spending settings; agents cannot change them.',
    inputSchema: z.strictObject({
      idempotency_key: z.string().uuid(), network,
      market: z.string().regex(/^(?:perp:[A-Za-z0-9_.-]+|spot:(?:@[0-9]+|PURR\/USDC))$/).max(80),
      side: z.enum(['buy', 'sell']), size: amount, limit_price: amount,
      order_type: z.enum(['limit', 'market']).optional(),
      time_in_force: z.enum(['Gtc', 'Alo']).optional(), reduce_only: z.boolean().optional(),
      leverage: z.number().int().min(1).max(50).optional(),
      expires_at: z.string().datetime({ offset: true }).nullable().optional(),
    }), annotations: spending,
  }, data => result(() => client.placeOrder(data)))
  server.registerTool('ourpay_wallet_exchange_order', {
    description: 'Read one durable exchange order by its OurPay UUID. filled_size reports executed quantity; average_price and fees are populated only when complete matching fill data is available. Cancel acknowledgment is distinct from a cancellation request. needs_attention requires reconciliation of the original order, never a replacement. Do not assume a canceled IOC had zero fills.',
    inputSchema: z.object({ order_id: z.string().uuid() }), annotations: readOnly,
  }, ({ order_id }) => result(() => client.exchangeOrder(order_id)))
  server.registerTool('ourpay_wallet_exchange_orders', {
    description: 'List the wallet’s 100 most recent OurPay exchange orders for this network, including pending and standing orders. Use exchange_account for the venue’s current positions and all open orders.',
    inputSchema: z.object({ network }), annotations: readOnly,
  }, ({ network }) => result(() => client.exchangeOrders(network)))
  server.registerTool('ourpay_wallet_cancel_order', {
    description: 'Request cancellation of an order created by this connection. Repeated calls are safe. The worker reconciles the same exchange client order ID; a request is not confirmed cancellation and an order may fill meanwhile. Poll the original order. Canceling does not close any filled position. To change price or size, confirm cancellation before submitting a new order with a new UUID.',
    inputSchema: z.object({ order_id: z.string().uuid() }), annotations: spending,
  }, ({ order_id }) => result(() => client.cancelOrder(order_id)))
  server.registerTool('ourpay_wallet_exchange_fills', {
    description: 'Read Hyperliquid execution receipts including actual prices, sizes, fees, realized PnL and trade IDs. Times are Unix milliseconds. Follow next_start_time inclusively and deduplicate by tid. The venue retains only its recent fill history, so this is not a complete accounting archive. An empty fees object on an order means unavailable, not zero fees.',
    inputSchema: z.object({ network, start_time: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), end_time: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional() }), annotations: readOnly,
  }, ({ network, start_time, end_time }) => result(() => client.exchangeFills(network, start_time, end_time)))
}
