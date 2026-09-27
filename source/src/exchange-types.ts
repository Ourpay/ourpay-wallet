export type ExchangeNetwork = 'mainnet' | 'testnet'

export interface ExchangePolicy {
  id: string; credential_id: string; network: ExchangeNetwork; markets: string[]
  expires_at: string | null; max_leverage: number; max_order_notional: string
  max_total_notional: string; max_orders: number; max_open_orders: number
  max_slippage_bps: number; max_fee_bps: number; reserved_notional: string; reserved_orders: number
}

export interface ExchangeCapabilities {
  enabled: boolean; venue: 'hyperliquid'; networks: ExchangeNetwork[]
  policy: ExchangePolicy | null; owner_permissions_url: string; margin_mode: 'isolated'; margin_modes: ('isolated' | 'cross')[]; concurrent_positions: boolean
  order_types: string[]; expiry_behavior: string
}

export interface ExchangeMarket {
  id: string; name: string; coin: string; kind: 'spot' | 'perpetual'; asset: number
  dex: string; quote_symbol: string; quote_token: number; quote_usd_price: string | null; margin_modes: ('isolated' | 'cross')[]
  size_decimals: number; max_leverage: number; mark_price: string
  funding_rate: string | null; open_interest: string | null
  previous_day_price: string | null; daily_volume_usd: string | null; oracle_price: string | null
  order_constraints: {
    size_step: string; price_max_decimals: number
    price_max_significant_figures: number; integer_prices_allowed: boolean
  }
}

export type ExchangeCandleInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '8h' | '12h' | '1d' | '3d' | '1w'

export interface ExchangeMarketData {
  venue: 'hyperliquid'; network: ExchangeNetwork; observed_at: string; market: ExchangeMarket
  interval: ExchangeCandleInterval; order_book: Record<string, unknown> | null
  recent_trades: Record<string, unknown>[] | null; candles: Record<string, unknown>[] | null
  errors: Record<string, string>
}

export interface ExchangeAccount {
  venue: 'hyperliquid'; network: ExchangeNetwork; address: string
  dex: string; perpetuals: Record<string, unknown>; spot: Record<string, unknown>
  open_orders: Record<string, unknown>[]; funding_instructions_url: string
  observed_at: string; account_url: string; trading_url: string
  fee_schedule: Record<string, unknown> | null; errors: Record<string, string>
}

export interface ExchangeOrderRequest {
  idempotency_key: string; network: ExchangeNetwork; market: string; side: 'buy' | 'sell'
  size: string; limit_price: string; expires_at?: string | null
  order_type?: 'limit' | 'market'; time_in_force?: 'Gtc' | 'Alo'
  reduce_only?: boolean; leverage?: number; margin_mode?: 'isolated' | 'cross'
}

export interface ExchangeOrder {
  id: string; network: ExchangeNetwork; credential_id: string; policy_id: string | null
  idempotency_key: string; client_order_id: string; market: string; request: ExchangeOrderRequest
  status: 'queued' | 'submitting' | 'open' | 'filled' | 'canceled' | 'rejected' | 'expired' | 'needs_attention'
  exchange_order_id: number | null; exchange_status: string | null
  filled_size: string; average_price: string | null; fees: Record<string, string>
  expires_at: string | null; cancel_requested_at: string | null; last_error: string | null
}

export interface ExchangeFills {
  fills: Record<string, unknown>[]; next_start_time: number | null; deduplicate_by: 'tid'
}
