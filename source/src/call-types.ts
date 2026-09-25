import type { Transaction } from './client.js'

export type CallRule = {
  kind: 'exact_call'; target: string; calldata: string; max_value: string; acknowledge_asset_access: true
} | { kind: 'token_transfer'; token: string; recipient: string; max_amount: string }

export interface CallPolicy {
  id: string
  credential_id: string
  chain_id: number
  expires_at: string | null
  rules: CallRule[]
  max_calls: number
  max_native_value: string
  max_network_fee: string
  reserved_calls: number
  reserved_native_value: string
  reserved_network_fee: string
  reserved_tokens: Record<string, string>
}

export interface WalletCall { target: string; calldata: string; value?: string }

export interface ExecuteCalls {
  idempotency_key: string
  chain_id: number
  calls: WalletCall[]
  max_network_fee: string
  atomic_required?: false
  simulation_required?: true
}

export interface CallBatch {
  chain_id: number
  id: string
  policy_id: string | null
  idempotency_key: string
  atomic: false
  status: 'pending' | 'confirmed' | 'failed' | 'partial' | 'canceled'
  max_network_fee: string
  failure_reason: string | null
  calls: (WalletCall & { id: string; position: number; simulated_block: number | null; transaction: Transaction | null })[]
}

export interface CallCapabilities {
  enabled: boolean
  atomic: false
  simulation_required: true
  enforcement: 'ourpay_server'
  policy: CallPolicy | null
  owner_permissions_url: string
}
