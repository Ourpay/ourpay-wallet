export type ExchangeNetwork = 'mainnet' | 'testnet'

export interface ExchangePolicy {
  id: string; credential_id: string; network: ExchangeNetwork; markets: string[]
  expires_at: string | null; max_leverage: number; max_order_notional: string
  max_total_notional: string; max_orders: number; max_open_orders: number
  max_slippage_bps: number; max_fee_bps: number; reserved_notional: string; reserved_orders: number
}

export interface ExchangeCapabilities {
  enabled: boolean; venue: 'hyperliquid'; networks: ExchangeNetwork[]
  policy: ExchangePolicy | null; owner_permissions_url: string; margin_mode: 'isolated'
  order_types: string[]; expiry_behavior: string
}

export interface ExchangeMarket {
  id: string; name: string; coin: string; kind: 'spot' | 'perpetual'; asset: number
  size_decimals: number; max_leverage: number; mark_price: string
  funding_rate: string | null; open_interest: string | null
}

export interface ExchangeAccount {
  venue: 'hyperliquid'; network: ExchangeNetwork; address: string
  perpetuals: Record<string, unknown>; spot: Record<string, unknown>
  open_orders: Record<string, unknown>[]; funding_instructions_url: string
}

export interface ExchangeOrderRequest {
  idempotency_key: string; network: ExchangeNetwork; market: string; side: 'buy' | 'sell'
  size: string; limit_price: string; expires_at?: string | null
  order_type?: 'limit' | 'market'; time_in_force?: 'Gtc' | 'Alo'
  reduce_only?: boolean; leverage?: number
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
