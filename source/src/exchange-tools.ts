import { type ToolResult, externalReadOnly as readOnly, spending } from './tool-support.js'
import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { AgentWalletClient } from './client.js'

export const network = z.enum(['mainnet', 'testnet'])
export const amount = z.string().regex(/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,18})?$/).max(38)

export const exchangeMarket = z.string().regex(/^(?:perp:(?:[A-Za-z0-9_.-]+:)?[A-Za-z0-9_.-]+|spot:(?:@[0-9]+|PURR\/USDC))$/).max(80)

const exchangeOrderInput = z.strictObject({
      idempotency_key: z.string().uuid(), network,
      market: exchangeMarket,
      side: z.enum(['buy', 'sell']), size: amount, limit_price: amount,
      order_type: z.enum(['limit', 'market']).optional(),
      trigger: z.strictObject({ price: amount, kind: z.enum(['sl', 'tp']) }).nullable().optional(),
      time_in_force: z.enum(['Gtc', 'Alo']).optional(), reduce_only: z.boolean().optional(),
      leverage: z.number().int().min(1).max(1000).optional(), margin_mode: z.enum(['isolated', 'cross']).optional(),
      expires_at: z.string().datetime({ offset: true }).nullable().optional(),
    })

export function registerExchangeTools(server: McpServer, client: AgentWalletClient, result: ToolResult) {
  server.registerTool('ourpay_wallet_exchange_capabilities', {
    description: 'Read Hyperliquid trading permissions for this connection. With no custom policy, orders use the wallet-wide daily USD limit (reference notional plus reserved fees), or owner-enabled Risky mode. Existing custom policies remain until the owner saves shared settings. Permissions stay active until revoked when expiry is absent. Agents cannot grant themselves permission. Notional budgets count attempts and are not loss limits. Liquidation and funding costs remain possible. Expiry, pause and revocation request cancellation; venue orders can fill until cancellation is acknowledged, and positions stay open.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.exchangeCapabilities()))
  server.registerTool('ourpay_wallet_exchange_markets', {
    description: 'Discover live Hyperliquid perpetual markets across default and builder-deployed (HIP-3) venues, and spot pairs across all quote assets, exact market IDs, size decimals, order_constraints (size step and price precision), mark prices, funding rates and maximum leverage. These are exchange assets, not EVM token addresses. Use the returned ID such as perp:BTC or spot:@107. A listed market still needs liquidity and owner permission. Use offset and limit to page through the full catalogue. Read dex, quote_symbol, quote_usd_price and margin_modes; collateral differs by venue. Null USD valuation prevents normal dollar-budget execution. Assets may be unavailable in your jurisdiction.',
    inputSchema: z.object({ network, search: z.string().max(80).optional(), limit: z.number().int().min(1).max(500).optional(), offset: z.number().int().min(0).max(10000).optional() }), annotations: readOnly,
  }, ({ network, search, limit, offset }) => result(() => client.exchangeMarkets(network, search, limit, offset)))
  server.registerTool('ourpay_wallet_exchange_market_data', {
    description: 'Analyze a supported Hyperliquid market before deciding whether to trade: mark/oracle and previous-day prices, 24-hour USD volume, funding rate, open interest in base units, up to 20 order-book levels per side, 100 recent trades and up to 500 OHLCV candles. Use an exact ID from exchange_markets. Read observed_at and provider timestamps; this is a detailed snapshot. Use exchange_updates for coalesced shared server-feed changes. Candle closed=false means still forming. Null sections with errors are unavailable, never empty or zero. Refresh missing or stale data before trading. Combine with exchange_account, exchange_fills and capabilities for positions, collateral, execution fees and permissions. This tool does not place trades or start an autonomous trading loop. Only trade within the user’s requested task; existing owner permissions still apply.',
    inputSchema: z.object({ network, market: exchangeMarket, interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '8h', '12h', '1d', '3d', '1w']).optional(), limit: z.number().int().min(1).max(500).optional() }), annotations: readOnly,
  }, ({ network, market, interval, limit }) => result(() => client.exchangeMarketData(network, market, interval, limit)))
  server.registerTool('ourpay_wallet_exchange_account', {
    description: 'Read Hyperliquid positions, margin, liquidation prices, unrealized PnL, spot balances and open orders for this wallet address. HyperCore exchange funds are separate from on-chain EVM/Solana and HyperEVM HYPE balances. Before requesting a separate top-up, use ourpay_wallet_funding_sources and ourpay_wallet_prepare_funding to fund mainnet spot/perpetual USDC from existing wallet funds. Recheck this account after funding is confirmed. Read dex-specific collateral for builder-deployed markets. fee_schedule is the current base account schedule; rates are decimal fractions and venue-specific fees may differ. Null fees with errors mean unavailable, not zero. The direct exchange tools do not submit withdrawals or internal collateral transfers; authorized connected-app signing is a separate flow. Never request a recovery phrase.',
    inputSchema: z.object({ network, dex: z.string().regex(/^[A-Za-z0-9_.-]{0,40}$/).optional() }), annotations: readOnly,
  }, ({ network, dex }) => result(() => client.exchangeAccount(network, dex)))
  server.registerTool('ourpay_wallet_place_order', {
    description: 'Place an owner-authorized Hyperliquid spot or perpetual order using a supported isolated/cross margin mode. Decimal size and price are human token units, not integer base units. Buy/sell opens long/short; reduce_only closes an existing position. limit uses Gtc or Alo (post-only); market uses IOC with limit_price as the worst acceptable price and may partially fill or not fill. For native perpetual stop-loss/take-profit orders set trigger={kind:sl|tp,price}; order_type selects market or limit execution after triggering. Set reduce_only=true for exits. Triggers are independent, not an OCO bracket: cancel the sibling when the position closes. Trigger price and limit price must satisfy venue precision; market-trigger limit_price bounds execution relative to the trigger. Native triggers rest at Hyperliquid and do not depend on this chat staying open. Triggered is not proof of a fill. Multiple markets and positions may run concurrently; nonces are serialized safely. Cross margin exposes the venue account collateral to liquidation. Existing isolated-only policies do not authorize cross margin. Respect returned size/price precision and leverage limits. Reuse one UUID and identical inputs across retries. Omit expires_at or use null for a standing order until canceled. Set it only when the user task needs a deadline, within any owner expiry. It is OurPay cancellation time, not a venue-enforced lifetime. Read status; queued/open is not filled. Never replace an uncertain order automatically. Read ourpay_wallet for current shared spending settings; agents cannot change them.',
    inputSchema: exchangeOrderInput, annotations: spending,
  }, data => result(() => client.placeOrder(data)))
  server.registerTool('ourpay_wallet_place_orders', {
    description: 'Submit 1–10 independently authorized Hyperliquid orders concurrently. Each needs a distinct idempotency UUID. This is not atomic: inspect each order or approval/error result; one failure does not cancel the others. Nonces are serialized on the server and existing exposure/margin and spending controls apply. Retry only the original failed or uncertain request with identical parameters and its original UUID, never replace successful entries. Does not choose trades for you.',
    inputSchema: z.object({ orders: z.array(exchangeOrderInput).min(1).max(10) }), annotations: spending,
  }, ({ orders }) => result(() => client.placeOrders(orders)))
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
