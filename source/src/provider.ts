import { AgentWalletClient, WalletAPIError, WalletApprovalRequiredError } from './client.js'
import type { WalletApprovalRequired } from './client.js'
import type { ExecuteCalls, WalletCall } from './call-types.js'

type Listener = (...args: unknown[]) => void
export type OurPayProviderOptions = { chainId: number; maxNetworkFee: string; origin?: string; timeoutMs?: number; pollMs?: number; onApprovalRequest?: (request: WalletApprovalRequired) => void; onSignatureRequest?: (request: { id: string; owner_approval_url: string }) => void; onConnectionRequest?: (request: { id: string; owner_approval_url: string }) => void }
export const walletReadMethods = ['eth_blockNumber', 'eth_getBalance', 'eth_getCode', 'eth_getStorageAt', 'eth_call', 'eth_estimateGas', 'eth_gasPrice', 'eth_getTransactionCount', 'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_getBlockByNumber', 'eth_getBlockByHash', 'eth_getLogs']
export const walletSigningMethods = ['personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction', 'wallet_sendCalls', 'wallet_getCallsStatus', 'wallet_getCapabilities']
const reads = new Set(walletReadMethods)

export class WalletProviderError extends Error {
  constructor(public readonly code: number, message: string, public readonly data?: unknown) { super(message) }
}

export class OurPayProvider {
  #chain: number
  #listeners = new Map<string, Listener[]>()
  #pending = new Map<string, { key: string; expiresAt: string; operation?: string }>()
  #connected = false
  #requests = new Map<string, Promise<unknown>>()
  constructor(private readonly wallet: AgentWalletClient, private readonly options: OurPayProviderOptions) {
    if (!Number.isSafeInteger(options.chainId) || options.chainId <= 0 || !/^[1-9][0-9]{0,77}$/.test(options.maxNetworkFee)) throw new WalletProviderError(-32602, 'Set a valid chain ID and an explicit network-fee cap.')
    this.#chain = options.chainId
    if (options.origin) {
      const url = new URL(options.origin)
      if (url.protocol !== 'https:' || url.origin !== options.origin) throw new WalletProviderError(-32602, 'Use an exact HTTPS app origin.')
    }
  }
  on(event: string, listener: Listener) { this.#listeners.set(event, [...(this.#listeners.get(event) ?? []), listener]); return this }
  removeListener(event: string, listener: Listener) { this.#listeners.set(event, (this.#listeners.get(event) ?? []).filter(item => item !== listener)); return this }
  private emit(event: string, value: unknown) { for (const listener of this.#listeners.get(event) ?? []) listener(value) }
  get chainId() { return `0x${this.#chain.toString(16)}` }

  private async dapp(chain: number, connect = false) {
    if (!this.options.origin) return undefined
    const connection = connect ? await this.wallet.connectDapp(this.options.origin, [chain])
      : (await this.wallet.dapps()).find(item => item.origin === this.options.origin)
    if (!connection?.approved_by_id || !connection.connected || connection.revoked_at || (connection.expires_at !== null && Date.parse(connection.expires_at) <= Date.now()) || !connection.chain_ids.includes(chain)) {
      if (connection && !connection.approved_by_id) this.options.onConnectionRequest?.(connection)
      throw new WalletProviderError(4100, 'Connect and authorize this crypto app in OurPay first.', connection && { dapp_connection_id: connection.id, owner_approval_url: connection.owner_approval_url })
    }
    return connection
  }
  async disconnect() {
    if (this.options.origin) {
      const connection = (await this.wallet.dapps()).find(item => item.origin === this.options.origin)
      if (connection) await this.wallet.disconnectDapp(connection.id)
    }
    this.#connected = false
    this.emit('accountsChanged', [])
    this.emit('disconnect', { code: 4900, message: 'The app was disconnected.' })
  }
  private async account(connect = false) {
    await this.dapp(this.#chain, connect)
    const account = (await this.wallet.wallet()).address
    if (!this.#connected) { this.#connected = true; this.emit('connect', { chainId: this.chainId }); this.emit('accountsChanged', [account]) }
    return account
  }
  private async checkFrom(value: unknown) {
    const account = await this.account()
    if (value !== undefined && (typeof value !== 'string' || value.toLowerCase() !== account.toLowerCase())) throw new WalletProviderError(4100, 'The requested account is not this wallet.')
    return account
  }
  private pending(chain: number, method: string, params: unknown) {
    const fingerprint = JSON.stringify([chain, method, params])
    let pending = this.#pending.get(fingerprint)
    if (!pending) { pending = { key: crypto.randomUUID(), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() }; this.#pending.set(fingerprint, pending) }
    return { fingerprint, pending }
  }
  private async poll<T>(operation: () => Promise<T | undefined>, data: unknown): Promise<T> {
    const deadline = Date.now() + (this.options.timeoutMs ?? 120_000)
    while (Date.now() < deadline) {
      const value = await operation()
      if (value !== undefined) return value
      await new Promise(resolve => setTimeout(resolve, this.options.pollMs ?? 1_000))
    }
    throw new WalletProviderError(-32002, 'The wallet operation is pending. Resume the existing operation instead of creating another.', data)
  }
  async request({ method, params = [] }: { method: string; params?: readonly unknown[] | object }): Promise<unknown> {
    const chain = this.#chain
    const key = JSON.stringify([chain, method, params])
    if (this.#requests.has(key)) return this.#requests.get(key)
    const request = this.perform(chain, method, params)
    this.#requests.set(key, request)
    try { return await request } finally { this.#requests.delete(key) }
  }
  private async perform(chain: number, method: string, params: readonly unknown[] | object): Promise<unknown> {
    try {
      if (!Array.isArray(params)) throw new WalletProviderError(-32602, 'This method expects an array of parameters.')
      if (reads.has(method)) return await this.wallet.rpc(chain, method, params)
      if (method === 'eth_chainId') return `0x${chain.toString(16)}`
      if (method === 'net_version') return String(chain)
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
        try { return [await this.account(method === 'eth_requestAccounts')] }
        catch (error) { if (method === 'eth_accounts' && error instanceof WalletProviderError && error.code === 4100) return []; throw error }
      }
      if (method === 'wallet_revokePermissions') { await this.disconnect(); return null }
      if (method === 'wallet_switchEthereumChain') {
        const value = params[0]?.chainId
        if (typeof value !== 'string' || !/^0x[1-9a-f][0-9a-f]*$/i.test(value) || !Number.isSafeInteger(Number(value))) throw new WalletProviderError(-32602, 'Invalid chain ID.')
        const networks = await this.wallet.networks()
        if (!networks.some(network => network.family !== 'solana' && network.chain_id === Number(value))) throw new WalletProviderError(4902, 'This EVM chain is not configured in OurPay.')
        await this.dapp(Number(value))
        this.#chain = Number(value); this.emit('chainChanged', this.chainId); return null
      }
      if (method === 'personal_sign' || method === 'eth_signTypedData_v4') return await this.sign(chain, method, params)
      if (method === 'eth_sendTransaction') return await this.send(chain, params[0])
      if (method === 'wallet_sendCalls') {
        const batch = params[0]
        if (!batch || batch.version !== '2.0.0' || typeof batch.atomicRequired !== 'boolean' || batch.id !== undefined) throw new WalletProviderError(-32602, 'Use version 2.0.0 and specify atomicRequired. App-supplied batch IDs are unsupported in this version.')
        if (batch.atomicRequired) throw new WalletProviderError(5760, 'Atomic execution is unsupported.')
        this.capabilities(batch.capabilities)
        await this.checkFrom(batch.from)
        if (typeof batch.chainId !== 'string' || !/^0x[1-9a-f][0-9a-f]*$/i.test(batch.chainId) || Number(batch.chainId) !== chain) throw new WalletProviderError(5710, 'Switch to the requested chain first.')
        if (!Array.isArray(batch.calls) || !batch.calls.length || batch.calls.length > 10) throw new WalletProviderError(5740, 'Supply between one and ten calls.')
        const { pending, fingerprint } = this.pending(chain, method, batch)
        const result = await this.approvedCalls({ idempotency_key: pending.key, chain_id: chain, calls: batch.calls.map((call: unknown) => this.call(call)), max_network_fee: this.options.maxNetworkFee })
        this.#pending.delete(fingerprint)
        return { id: `0x${result.id.replaceAll('-', '')}` }
      }
      if (method === 'wallet_getCallsStatus') {
        if (typeof params[0] !== 'string' || !/^0x[0-9a-f]{32}$/i.test(params[0])) throw new WalletProviderError(5730, 'Unknown OurPay batch ID.')
        const hex = params[0].slice(2)
        const batch = await this.wallet.callBatch(`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`)
        const transactions = batch.calls.flatMap(call => call.transaction ? [call.transaction] : [])
        const receipts = (await Promise.all(transactions.map(tx => this.wallet.rpc(tx.chain_id, 'eth_getTransactionReceipt', [tx.transaction_hash])))).filter(Boolean)
        return { version: '2.0.0', id: params[0], chainId: `0x${batch.chain_id.toString(16)}`, atomic: false, status: batch.status === 'failed' ? (receipts.length ? 500 : 400) : ({ pending: 100, confirmed: 200, partial: 600, canceled: 400 } as const)[batch.status], receipts }
      }
      if (method === 'wallet_getCapabilities') {
        await this.checkFrom(params[0])
        const networks = (await this.wallet.networks()).filter(network => network.family !== 'solana')
        if (params[1] !== undefined && (!Array.isArray(params[1]) || params[1].some((id: unknown) => typeof id !== 'string' || !/^0x[1-9a-f][0-9a-f]*$/i.test(id)))) throw new WalletProviderError(-32602, 'Invalid chain filter.')
        const capability = await this.wallet.callCapabilities()
        return Object.fromEntries(networks.filter(network => !params[1] || params[1].some((id: string) => Number(id) === network.chain_id)).map(network => [`0x${network.chain_id.toString(16)}`, capability.enabled ? { atomic: { status: 'unsupported' } } : {}]))
      }
      throw new WalletProviderError(4200, `Unsupported OurPay wallet method: ${method}`)
    } catch (error) {
      if (error instanceof WalletProviderError) throw error
      if (error instanceof WalletAPIError) throw new WalletProviderError(error.status === 503 ? 4900 : [401, 403, 409].includes(error.status) ? 4100 : -32602, error.message)
      throw new WalletProviderError(-32602, 'Invalid or unavailable wallet request.')
    }
  }
  private call(raw: unknown): WalletCall {
    const tx = raw as { to?: unknown; data?: unknown; value?: unknown; capabilities?: Record<string, { optional?: boolean }> }
    if (!tx || typeof tx.to !== 'string' || !/^0x[0-9a-f]{40}$/i.test(tx.to) || tx.data !== undefined && (typeof tx.data !== 'string' || !/^0x([0-9a-f]{2})*$/i.test(tx.data)) || tx.value !== undefined && (typeof tx.value !== 'string' || !/^0x[0-9a-f]+$/i.test(tx.value))) throw new WalletProviderError(-32602, 'Invalid transaction address, calldata or hex value.')
    this.capabilities(tx.capabilities)
    return { target: tx.to, calldata: (tx.data as string | undefined) ?? '0x', value: BigInt((tx.value as string | undefined) ?? '0x0').toString() }
  }
  private capabilities(value?: Record<string, { optional?: boolean }>) {
    if (value && Object.values(value).some(capability => !capability || capability.optional !== true)) throw new WalletProviderError(5700, 'An additional required capability is unsupported.')
  }
  private async send(chain: number, raw: unknown) {
    const tx = raw as Record<string, unknown>
    await this.checkFrom(tx?.from)
    if (!tx || tx.chainId !== undefined && Number(tx.chainId) !== chain || ['nonce', 'gas', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'accessList', 'authorizationList', 'type'].some(key => tx[key] !== undefined)) throw new WalletProviderError(-32602, 'Use the selected chain and let OurPay manage transaction fees, type and nonces under the configured fee cap.')
    const call = this.call(raw)
    const { pending, fingerprint } = this.pending(chain, 'eth_sendTransaction', call)
    if (!pending.operation) {
      const batch = await this.approvedCalls({ idempotency_key: pending.key, chain_id: chain, calls: [call], max_network_fee: this.options.maxNetworkFee })
      pending.operation = batch.id
    }
    const hash = await this.poll(async () => {
      const batch = await this.wallet.resumeCallBatch(pending.operation!)
      const transaction = batch.calls[0]?.transaction
      if (transaction && ['broadcast', 'confirmed'].includes(transaction.status)) return transaction.transaction_hash
      if (batch.status !== 'pending') throw new WalletProviderError(4001, batch.failure_reason ?? 'The transaction was not submitted.', { batch_id: batch.id })
      return undefined
    }, { batch_id: pending.operation, idempotency_key: pending.key })
    this.#pending.delete(fingerprint)
    return hash
  }
  private async approvedCalls(data: ExecuteCalls) {
    try { return await this.wallet.executeCalls(data) }
    catch (error) {
      if (!(error instanceof WalletApprovalRequiredError)) throw error
      this.options.onApprovalRequest?.(error.approval)
      const id = await this.poll(async () => {
        const approval = await this.wallet.approval(error.approval.approval_id)
        if (approval.status === 'submitted' && approval.result_id) return approval.result_id
        if (['rejected', 'failed'].includes(approval.status) || Date.parse(approval.expires_at) <= Date.now()) {
          throw new WalletProviderError(4001, approval.failure_reason ?? 'The action was rejected or expired.', { approval_id: approval.id })
        }
        return undefined
      }, error.approval)
      return this.wallet.callBatch(id)
    }
  }
  private async sign(chain: number, method: 'personal_sign' | 'eth_signTypedData_v4', params: unknown[]) {
    await this.checkFrom(method === 'personal_sign' ? params[1] : params[0])
    let payload: Record<string, unknown>
    if (method === 'personal_sign') payload = { message: params[0] }
    else payload = (typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1]) as Record<string, unknown>
    const { pending, fingerprint } = this.pending(chain, method, payload)
    if (!pending.operation) {
      const connection = await this.dapp(chain)
      const record = await this.wallet.requestSignature({ idempotency_key: pending.key, chain_id: chain, method, payload, expires_at: pending.expiresAt, ...(connection ? { dapp_connection_id: connection.id } : {}) })
      pending.operation = record.id
      if (record.status === 'pending') this.options.onSignatureRequest?.(record)
    }
    const signature = await this.poll(async () => {
      const record = await this.wallet.signature(pending.operation!)
      if (record.status === 'signed' && record.signature) return record.signature
      if (record.status === 'rejected' || Date.parse(record.expires_at) <= Date.now()) throw new WalletProviderError(4001, 'The signing request was rejected or expired.')
      return undefined
    }, { signature_id: pending.operation, idempotency_key: pending.key })
    this.#pending.delete(fingerprint)
    return signature
  }
}
