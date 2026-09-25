import type { CallBatch, CallCapabilities, ExecuteCalls } from './call-types.js'
import type { Trade, TradeRequest, TradingCapabilities } from './trade-types.js'
import type { SignatureRequest, WalletSignature } from './signature-tools.js'
import type { WalletFunding, FundingCapabilities, FundingQuoteRequest } from './funding-tools.js'
export type { WalletFunding } from './funding-tools.js'
import type { DappConnection } from './dapp-tools.js'
import type { ExchangeAccount, ExchangeCapabilities, ExchangeFills, ExchangeMarket, ExchangeNetwork, ExchangeOrder, ExchangeOrderRequest } from './exchange-types.js'
export type * from './exchange-types.js'
export type { SignatureRequest, WalletSignature } from './signature-tools.js'
export type { Trade, TradeRequest, TradingCapabilities, TradingPolicy, TradingRule } from './trade-types.js'
export type { CallBatch, CallCapabilities, CallPolicy, CallRule, ExecuteCalls, WalletCall } from './call-types.js'

export interface Wallet {
  id: string
  name: string
  address: string
  status: 'awaiting_backup' | 'active' | 'paused'
  backup_revealed_at: string | null
  backup_confirmed_at: string | null
  spending?: WalletSpending
}

export interface WalletSpending {
  daily_limit_usd: string
  reserved_today_usd: string
  remaining_today_usd: string | null
  risky_mode: boolean
  revision: number
  resets_at: string
  reset_timezone: 'UTC'
}

export interface ProvisionedWallet {
  wallet: Wallet | null
  setup_url: string | null
  connection_request?: { id: string; name: string; expires_at: string; approved: boolean; owner_approval_url: string }
}

export interface WalletNetwork {
  chain_id: number; name: string; family: 'evm' | 'solana'; native_symbol: string
  native_token: string; native_decimals: number; testnet: boolean
  fee_model: 'standard' | 'op_stack' | 'unsupported'
  execution_enabled: boolean
  tokens: { address: string; symbol: string; decimals: number }[]
}

export interface Transfer {
  idempotency_key: string
  chain_id: number
  token: string
  recipient: string
  amount: string
  max_network_fee?: string
}

export interface Transaction extends Transfer {
  id: string
  kind: 'transfer' | 'approval' | 'swap' | 'contract_call'
  status: 'signed' | 'broadcast' | 'confirmed' | 'failed' | 'canceled'
  transaction_hash: string
  network_fee_limit: string
  network_fee_paid: string | null
  failure_reason: string | null
}

export interface SwapRequest {
  idempotency_key: string
  from_chain_id: number
  from_token: string
  from_amount: string
  to_chain_id: number
  to_token: string
  min_to_amount: string
  slippage_bps?: number
  max_network_fee: string
  max_native_value?: string
}

export interface Swap extends SwapRequest {
  id: string
  status: 'quoted' | 'executing' | 'bridging' | 'confirmed' | 'failed' | 'needs_attention' | 'expired'
  expected_to_amount: string
  received_amount: string | null
  approval_transaction_id: string | null
  source_transaction_id: string | null
  destination_transaction_hash: string | null
  failure_reason: string | null
  funding: { provider: 'relay'; destination: string; recipient: string; destination_decimals: number; destination_symbol: string; fee_usdc_base_units: string; gasless: true; continuation: Omit<FundingQuoteRequest, 'idempotency_key' | 'from_amount'> | null } | null
}

export interface PurchaseRequest {
  idempotency_key: string
  checkout_client_secret: string
  payment_method_id?: string
  expected_checkout_amount: number
  expected_checkout_currency: string
  from_chain_id: number
  from_token: string
  max_from_amount: string
  slippage_bps?: number
  max_network_fee: string
  max_native_value?: string
  max_destination_network_fee: string
}

export interface Purchase {
  id: string
  status: 'quoted' | 'converting' | 'paying' | 'awaiting_payment' | 'succeeded' | 'failed' | 'needs_attention' | 'expired'
  collection_id: string
  chain_id: number
  token: string
  recipient: string
  amount: string
  checkout_amount: number
  checkout_currency: string
  swap_id: string | null
  transaction_id: string | null
  order_id: string | null
  failure_reason: string | null
}

export interface CheckoutDetails {
  customer_email?: string
  customer_name?: string
  customer_billing_address?: { country: string; line1?: string; line2?: string; city?: string; postal_code?: string; state?: string }
  customer_tax_id?: string
}

export interface Checkout {
  id: string
  status: string
  total_amount: number
  currency: string
  payment_processor: string
}

export class WalletAPIError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export interface WalletApprovalRequired {
  detail: string
  approval_id: string
  status: 'pending' | 'approved'
  owner_approval_url: string
}

export interface WalletApproval {
  id: string
  credential_id: string
  agent_name: string
  operation: 'transfer' | 'calls' | 'swap' | 'trade' | 'purchase' | 'exchange_order'
  status: 'pending' | 'approved' | 'submitted' | 'rejected' | 'failed'
  payload: Record<string, unknown>
  request_hash: string
  expires_at: string
  result_id: string | null
  failure_reason: string | null
  owner_approval_url: string
}

export class WalletApprovalRequiredError extends WalletAPIError {
  constructor(public readonly approval: WalletApprovalRequired) {
    super(428, `${approval.detail} Review: ${approval.owner_approval_url}`)
  }
}

export function validateAPIURL(value: string): string {
  const url = new URL(value)
  if (
    url.username || url.password || url.search || url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  ) throw new Error('Use an HTTPS OurPay API URL, or HTTP on localhost for development.')
  return url.toString().replace(/\/$/, '')
}

export class AgentWalletClient {
  readonly apiURL: string
  #token: string

  constructor(options: { apiURL: string; token: string }) {
    this.apiURL = validateAPIURL(options.apiURL)
    if (!/^ourpay_aw_[A-Za-z0-9_-]{43,128}$/.test(options.token))
      throw new Error('The wallet connection credential is invalid.')
    this.#token = options.token
  }

  private async request<T>(path: string, method = 'GET', body?: unknown, authorize = true, base = '/v1/agent-wallets'): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.apiURL}${base}${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: {
          Accept: 'application/json', 'Content-Type': 'application/json',
          ...(authorize ? { Authorization: `Bearer ${this.#token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new WalletAPIError(503, 'OurPay could not be reached. Keep this connection and retry the same request.')
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { detail?: unknown }
      if (response.status === 428 && typeof (error as WalletApprovalRequired).approval_id === 'string') {
        throw new WalletApprovalRequiredError(error as WalletApprovalRequired)
      }
      throw new WalletAPIError(response.status,
        typeof error.detail === 'string' ? error.detail : `OurPay rejected the request (${response.status}).`)
    }
    return response.status === 204 ? undefined as T : response.json() as Promise<T>
  }

  async provision(name = 'AI agent'): Promise<ProvisionedWallet> {
    try { return { wallet: await this.wallet(), setup_url: null } }
    catch (error) { if (!(error instanceof WalletAPIError) || error.status !== 401) throw error }
    const request = await this.request<NonNullable<ProvisionedWallet['connection_request']>>('/connection-requests', 'POST', { name, connection_token: this.#token }, false)
    return { wallet: null, setup_url: request.owner_approval_url, connection_request: request }
  }

  connectDapp(origin: string, chain_ids: number[]): Promise<DappConnection> { return this.request('/me/dapps', 'POST', { origin, chain_ids }) }
  dapps(): Promise<DappConnection[]> { return this.request('/me/dapps') }
  disconnectDapp(id: string): Promise<void> { return this.request(`/me/dapps/${encodeURIComponent(id)}/disconnect`, 'POST') }

  endSession(): Promise<void> { return this.request('/me/disconnect', 'POST') }
  requestFunding(chain_id: number, token: string, minimum_balance: string): Promise<WalletFunding> { return this.request(`/me/funding?${new URLSearchParams({ chain_id: String(chain_id), token, minimum_balance })}`) }
  fundingCapabilities(): Promise<FundingCapabilities> { return this.request('/me/funding/capabilities') }
  quoteFunding(data: FundingQuoteRequest): Promise<Swap> { return this.request('/me/funding/quotes', 'POST', data) }
  exchangeFunding(network: ExchangeNetwork, minimum_balance: string, account: 'perpetuals' | 'spot' = 'perpetuals'): Promise<WalletFunding> { return this.request(`/me/exchange/funding?${new URLSearchParams({ network, minimum_balance, account })}`) }
  async wallet(): Promise<Wallet> {
    const wallet = await this.request<Wallet>('/me')
    return { ...wallet, spending: await this.request<WalletSpending>('/me/spending') }
  }

  approval(id: string) { return this.request<WalletApproval>(`/me/approvals/${encodeURIComponent(id)}`) }
  exchangeCapabilities(): Promise<ExchangeCapabilities> { return this.request('/me/exchange/capabilities') }
  exchangeMarkets(network: ExchangeNetwork, search = '', limit = 100): Promise<ExchangeMarket[]> { return this.request(`/me/exchange/markets?${new URLSearchParams({ network, search, limit: String(limit) })}`) }
  exchangeAccount(network: ExchangeNetwork): Promise<ExchangeAccount> { return this.request(`/me/exchange/account?${new URLSearchParams({ network })}`) }
  placeOrder(data: ExchangeOrderRequest): Promise<ExchangeOrder> { return this.request('/me/exchange/orders', 'POST', data) }
  exchangeOrder(id: string): Promise<ExchangeOrder> { return this.request(`/me/exchange/orders/${encodeURIComponent(id)}`) }
  exchangeOrders(network: ExchangeNetwork): Promise<ExchangeOrder[]> { return this.request(`/me/exchange/orders?${new URLSearchParams({ network })}`) }
  cancelOrder(id: string): Promise<ExchangeOrder> { return this.request(`/me/exchange/orders/${encodeURIComponent(id)}/cancel`, 'POST') }
  exchangeFills(network: ExchangeNetwork, start_time: number, end_time?: number): Promise<ExchangeFills> { return this.request(`/me/exchange/fills?${new URLSearchParams({ network, start_time: String(start_time), ...(end_time === undefined ? {} : { end_time: String(end_time) }) })}`) }
  requestSignature(data: SignatureRequest): Promise<WalletSignature> { return this.request('/me/signatures', 'POST', data) }
  signature(id: string): Promise<WalletSignature> { return this.request(`/me/signatures/${encodeURIComponent(id)}`) }
  rpc(chain_id: number, method: string, params: unknown[] = []): Promise<unknown> { return this.request('/me/rpc', 'POST', { chain_id, method, params }) }
  tradingCapabilities(): Promise<TradingCapabilities> { return this.request('/me/trading-capabilities') }
  quoteTrade(data: TradeRequest): Promise<Trade> { return this.request('/me/trades', 'POST', data) }
  executeTrade(id: string): Promise<Trade> { return this.request(`/me/trades/${encodeURIComponent(id)}/execute`, 'POST') }
  trade(id: string): Promise<Trade> { return this.request(`/me/trades/${encodeURIComponent(id)}`) }
  trades(): Promise<Trade[]> { return this.request('/me/trades') }
  callCapabilities(): Promise<CallCapabilities> { return this.request('/me/call-capabilities') }
  executeCalls(data: ExecuteCalls): Promise<CallBatch> { return this.request('/me/call-batches', 'POST', data) }
  callBatch(id: string): Promise<CallBatch> { return this.request(`/me/call-batches/${encodeURIComponent(id)}`) }
  resumeCallBatch(id: string): Promise<CallBatch> { return this.request(`/me/call-batches/${encodeURIComponent(id)}/resume`, 'POST') }
  connector(): Promise<{ resource: string | null; scopes: string[] }> { return this.request('/me/connector') }
  networks(): Promise<WalletNetwork[]> { return this.request('/networks') }
  addresses(): Promise<{ evm: string; solana: string; solana_derivation_path: string }> { return this.request('/me/addresses') }
  assets(chainID: number, search = '', limit = 50): Promise<WalletNetwork['tokens']> { return this.request(`/assets?${new URLSearchParams({ chain_id: String(chainID), search, limit: String(limit) })}`) }
  async convert(request: SwapRequest): Promise<Swap> {
    const quote = await this.quoteSwap(request)
    return this.executeSwap(quote.id)
  }
  balance(chainID: number, token: string): Promise<unknown> {
    return this.request(`/me/balance?${new URLSearchParams({ chain_id: String(chainID), token })}`)
  }
  transfer(data: Transfer): Promise<Transaction> { return this.request('/me/transfers', 'POST', data) }
  transactions(): Promise<Transaction[]> { return this.request('/me/transactions') }
  transaction(id: string): Promise<Transaction> { return this.request(`/me/transactions/${encodeURIComponent(id)}`) }
  resume(id: string): Promise<Transaction> { return this.request(`/me/transactions/${encodeURIComponent(id)}/resume`, 'POST') }
  quoteSwap(data: SwapRequest): Promise<Swap> { return this.request('/me/swaps', 'POST', data) }
  swaps(): Promise<Swap[]> { return this.request('/me/swaps') }
  swap(id: string): Promise<Swap> { return this.request(`/me/swaps/${encodeURIComponent(id)}`) }
  executeSwap(id: string): Promise<Swap> { return this.request(`/me/swaps/${encodeURIComponent(id)}/execute`, 'POST') }
  quotePurchase(data: PurchaseRequest): Promise<Purchase> { return this.request('/me/purchases', 'POST', data) }
  purchases(): Promise<Purchase[]> { return this.request('/me/purchases') }
  purchase(id: string): Promise<Purchase> { return this.request(`/me/purchases/${encodeURIComponent(id)}`) }
  executePurchase(id: string): Promise<Purchase> { return this.request(`/me/purchases/${encodeURIComponent(id)}/execute`, 'POST') }
  checkout(secret: string): Promise<Checkout> {
    return this.request(`/client/${encodeURIComponent(secret)}`, 'GET', undefined, false, '/v1/checkouts')
  }
  async prepareCheckout(secret: string, details: CheckoutDetails): Promise<Checkout> {
    const checkout = await this.checkout(secret)
    if (checkout.status === 'succeeded') throw new WalletAPIError(409, 'This checkout is already paid. Do not pay again.')
    if (checkout.status === 'confirmed' && checkout.payment_processor === 'bitcart') return checkout
    return this.request(`/client/${encodeURIComponent(secret)}/confirm`, 'POST', { ...details, payment_processor: 'bitcart' }, false, '/v1/checkouts')
  }
}
