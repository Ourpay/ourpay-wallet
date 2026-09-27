import type { ExchangeNetwork } from './exchange-types.js'

export interface MarketTick {
  market: string; price: string; price_type: 'mark' | 'mid'; received_at_ms: number
  source_time_ms: number | null; funding_rate: string | null; open_interest: string | null
  volume_24h_quote: string | null; change_24h_bps: string | null
}
export interface MarketUpdates {
  network: ExchangeNetwork; cursor: string; reset: boolean; observed_at_ms: number
  stale_after_ms: number; updates: MarketTick[]; unavailable_markets: string[]
  stale_markets: string[]; delivery: 'coalesced_changes'
}
export interface TradingRunnerRequest {
  idempotency_key: string; name: string; network: ExchangeNetwork; market: string
  side: 'buy' | 'sell'; size: string; leverage?: number; margin_mode?: 'isolated' | 'cross'
  reduce_only?: boolean; interval_seconds: number; max_attempts: number
  max_total_notional_usd: string; max_slippage_bps?: number
  condition?: 'always' | 'above' | 'below'; threshold_price?: string | null; expires_at?: string | null
}
export interface TradingRunner {
  id: string; created_at: string; modified_at: string | null; credential_id: string
  idempotency_key: string; specification: TradingRunnerRequest
  status: 'active' | 'paused' | 'completed' | 'stopped'; next_run_at: string
  attempts: number; reserved_notional: string; pending_request: Record<string, unknown> | null
  last_order_id: string | null; last_error: string | null
}
