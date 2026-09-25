import type { Swap } from './client.js'

export interface TradingRule {
  sell_token: string
  buy_token: string
  max_sell_amount: string
  max_sell_per_trade: string
  max_slippage_bps: number
}

export interface TradingPolicy {
  id: string
  credential_id: string
  chain_id: number
  expires_at: string | null
  max_trades: number
  max_network_fee: string
  rules: TradingRule[]
  reserved_trades: number
  reserved_network_fee: string
  reserved_tokens: Record<string, string>
}

export interface TradeRequest {
  idempotency_key: string
  chain_id: number
  sell_token: string
  buy_token: string
  sell_amount: string
  min_buy_amount: string
  slippage_bps?: number
  max_network_fee: string
}

export interface Trade {
  id: string
  idempotency_key: string
  policy_id: string | null
  reserved_at: string | null
  swap: Swap
}

export interface TradingCapabilities {
  enabled: boolean
  adapter: 'lifi'
  order_types: ['exact_input']
  policy: TradingPolicy | null
  owner_permissions_url: string
  simulation_required: true
  same_chain_only: true
  enforcement: 'ourpay_server'
}
