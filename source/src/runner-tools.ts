import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { AgentWalletClient } from './client.js'
import { network, amount, exchangeMarket } from './exchange-tools.js'
import { type ToolResult, externalReadOnly as readOnly, spending } from './tool-support.js'

export function registerRunnerTools(server: McpServer, client: AgentWalletClient, result: ToolResult) {
  server.registerTool('ourpay_wallet_exchange_updates', {
    description: 'Read coalesced Hyperliquid prices, funding, open interest and volume from OurPay’s shared server feed. One upstream feed per network serves all wallets; this contains public data only. Select exact market IDs from exchange_markets. Pass the returned cursor as after; wait_seconds up to 25 waits for changes. reset=true requires replacing local selected-market state. Check stale_markets, unavailable_markets and timestamps; missing data is unknown, never zero. Mark prices are not executable quotes; spot prices are midpoints. Source timestamp may be null: received_at_ms is OurPay receive time, not venue execution time. Each call returns once; this tool cannot wake an idle chat or continuously inject model context. SDK watchExchange or a persistent client can follow updates. Use create_runner for a bounded server-side trading plan.',
    inputSchema: z.object({ network, markets: z.array(exchangeMarket).min(1).max(50), after: z.string().regex(/^[0-9]{1,20}-[0-9]{1,20}$/).optional(), wait_seconds: z.number().int().min(0).max(25).optional() }), annotations: readOnly,
  }, ({ network, markets, after, wait_seconds }) => result(() => client.exchangeUpdates(network, markets, after, wait_seconds)))
  server.registerTool('ourpay_wallet_create_runner', {
    description: 'Start a durable, bounded Hyperliquid trading plan only for the user’s explicitly requested ongoing trading task. Runs on OurPay’s worker after this chat closes, without a separately hosted AI model. At each interval (minimum 60 seconds), submit one fixed-size IOC if condition always/above/below matches fresh market data. No catch-up burst; next attempt waits for the prior order to reconcile. Required max_attempts and max_total_notional_usd bound lifetime reference-notional attempts, not losses, margin or funding charges. Failed attempts still count. Wallet daily limits and original agent permissions also apply. Normal mode requires owner approval for every order; Risky mode skips per-action approval. Pause/revocation/expiry stops new attempts and requests cancellation of a pending order, never closes positions. Uncertain outcomes pause for reconciliation. This is a fixed plan, not discretionary AI strategy, profit guarantee or high-frequency trading. Use native venue trigger orders for time-sensitive exits. Reuse one UUID and identical inputs for retries.',
    inputSchema: z.strictObject({ idempotency_key: z.string().uuid(), name: z.string().min(1).max(80), network, market: exchangeMarket, side: z.enum(['buy','sell']), size: amount, leverage: z.number().int().min(1).max(1000).optional(), margin_mode: z.enum(['isolated','cross']).optional(), reduce_only: z.boolean().optional(), interval_seconds: z.number().int().min(60).max(86400), max_attempts: z.number().int().min(1).max(10000), max_total_notional_usd: amount, max_slippage_bps: z.number().int().min(1).max(500).optional(), condition: z.enum(['always','above','below']).optional(), threshold_price: amount.nullable().optional(), expires_at: z.string().datetime({ offset: true }).nullable().optional() }), annotations: spending,
  }, data => result(() => client.createRunner(data)))
  server.registerTool('ourpay_wallet_runners', {
    description: 'List the wallet’s 100 most recent persistent trading plans, with original agent, status, next check, attempt count, reserved reference notional and latest error. Active means scheduled, not necessarily placing or filling orders. Inspect runner/order status and approvals before claiming a trade.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.runners()))
  server.registerTool('ourpay_wallet_runner', {
    description: 'Read one persistent trading plan and its last order ID. Pending requests may be awaiting owner approval, execution or reconciliation. Use exchange_order for venue acknowledgment/fills. Missing data is not proof that an order failed.',
    inputSchema: z.object({ runner_id: z.string().uuid() }), annotations: readOnly,
  }, ({ runner_id }) => result(() => client.runner(runner_id)))
  server.registerTool('ourpay_wallet_control_runner', {
    description: 'Pause, resume or permanently stop a trading plan. Only its original agent or the wallet owner can pause/stop; only the original agent can resume after reconciliation. Pause/stop rejects pending approvals and requests cancellation, but orders can fill until the venue acknowledges and positions remain open. A stopped/completed/expired plan cannot resume. Never resume without the user’s ongoing trading instruction.',
    inputSchema: z.object({ runner_id: z.string().uuid(), action: z.enum(['pause','resume','stop']) }), annotations: spending,
  }, ({ runner_id, action }) => result(() => client.controlRunner(runner_id, action)))
}
