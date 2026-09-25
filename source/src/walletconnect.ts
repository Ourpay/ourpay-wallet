import type { IWalletKit, WalletKitTypes } from '@reown/walletkit'
import type { SessionTypes } from '@walletconnect/types'
import { buildApprovedNamespaces } from '@walletconnect/utils'
import { AgentWalletClient } from './client.js'
import { OurPayProvider, WalletProviderError, walletReadMethods, walletSigningMethods, type OurPayProviderOptions } from './provider.js'

type Response = Parameters<IWalletKit['respondSessionRequest']>[0]['response']
type SavedRequest = { fingerprint: string; response?: Response }
export interface OurPayWalletConnectOptions extends Omit<OurPayProviderOptions, 'chainId'> {
  approveSession?: (proposal: WalletKitTypes.SessionProposal, namespaces: SessionTypes.Namespaces) => Promise<boolean>
  onError: (error: unknown) => void
}

export class OurPayWalletConnect {
  #providers = new Map<string, OurPayProvider>()
  #running = new Map<string, Promise<void>>()
  #started = false
  constructor(private readonly kit: IWalletKit, private readonly wallet: AgentWalletClient, private readonly options: OurPayWalletConnectOptions) {}

  start() {
    if (!this.#started) {
      this.kit.on('session_proposal', this.proposal)
      this.kit.on('session_request', this.request)
      this.#started = true
    }
    return this
  }
  stop() {
    this.kit.off('session_proposal', this.proposal)
    this.kit.off('session_request', this.request)
    this.#started = false
  }
  pair(uri: string) { return this.kit.pair({ uri }) }
  async disconnect(topic: string) {
    const session = this.kit.getActiveSessions()[topic]
    if (session) {
      const origin = new URL(session.peer.metadata.url).origin
      const connection = (await this.wallet.dapps()).find(item => item.origin === origin)
      if (connection) await this.wallet.disconnectDapp(connection.id)
    }
    return this.kit.disconnectSession({ topic, reason: { code: 6000, message: 'Owner disconnected this dApp.' } })
  }
  private proposal = (proposal: WalletKitTypes.SessionProposal) => { void this.handleProposal(proposal).catch(this.options.onError) }
  private request = (request: WalletKitTypes.SessionRequest) => { void this.handleRequest(request).catch(this.options.onError) }

  async handleProposal(proposal: WalletKitTypes.SessionProposal) {
    try {
      const address = (await this.wallet.wallet()).address
      const networks = await this.wallet.networks()
      const chains = networks.filter(network => network.family !== 'solana').map(network => `eip155:${network.chain_id}`)
      const namespaces = buildApprovedNamespaces({ proposal: proposal.params, supportedNamespaces: { eip155: {
        chains, accounts: chains.map(chain => `${chain}:${address}`),
        methods: ['eth_accounts', 'eth_requestAccounts', 'eth_chainId', 'net_version', ...walletReadMethods, ...walletSigningMethods],
        events: ['chainChanged', 'accountsChanged'],
      } } })
      if (this.options.approveSession) {
        if (!await this.options.approveSession(proposal, namespaces)) throw new WalletProviderError(4001, 'Owner declined the dApp session.')
      } else {
        const origin = new URL(proposal.params.proposer.metadata.url).origin
        const verified = proposal.verifyContext?.verified
        if (!verified || verified.validation !== 'VALID' || verified.origin !== origin) throw new WalletProviderError(4100, 'Automatic pairing requires a verified app origin or explicit host review.')
        const chainIDs = [...new Set(Object.values(namespaces).flatMap(namespace => namespace.accounts.map(account => Number(account.split(':')[1]))))]
        const connection = await this.wallet.connectDapp(origin, chainIDs)
        if (!connection.approved_by_id || !connection.connected || connection.revoked_at || (connection.expires_at !== null && Date.parse(connection.expires_at) <= Date.now())) {
          this.options.onConnectionRequest?.(connection)
          throw new WalletProviderError(4100, 'Authorize this app in OurPay and pair again.', { owner_approval_url: connection.owner_approval_url })
        }
      }
      return await this.kit.approveSession({ id: proposal.id, namespaces })
    } catch (error) {
      await this.kit.rejectSession({ id: proposal.id, reason: { code: 5000, message: 'The owner declined or the requested wallet capabilities are unsupported.' } })
      throw error
    }
  }

  async handleRequest(event: WalletKitTypes.SessionRequest): Promise<void> {
    const key = `ourpay:walletconnect:${event.topic}:${event.id}`
    if (this.#running.has(key)) return this.#running.get(key)
    const running = this.respond(key, event)
    this.#running.set(key, running)
    try { await running } finally { this.#running.delete(key) }
  }

  private async respond(key: string, event: WalletKitTypes.SessionRequest) {
    let response: Response
    const { chainId, request } = event.params
    const fingerprint = JSON.stringify([chainId, request])
    try {
      const session = this.kit.getActiveSessions()[event.topic]
      const address = (await this.wallet.wallet()).address
      const namespace = session?.namespaces[chainId] ?? session?.namespaces.eip155
      if (!session || session.expiry * 1000 <= Date.now() || !namespace?.accounts.some(account => account.toLowerCase() === `${chainId}:${address}`.toLowerCase()) || !namespace.methods.includes(request.method)) throw new WalletProviderError(4100, 'This dApp has no active permission for this account, chain or method.')
      if (!/^eip155:[1-9][0-9]*$/.test(chainId) || !Number.isSafeInteger(Number(chainId.split(':')[1]))) throw new WalletProviderError(4901, 'Unsupported wallet namespace or chain.')
      if (request.expiryTimestamp && request.expiryTimestamp * 1000 <= Date.now()) throw new WalletProviderError(4001, 'The dApp request expired.')
      const previous = await this.kit.core.storage.getItem<SavedRequest>(key)
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new WalletProviderError(-32602, 'The dApp reused a request ID with different arguments.')
        if (previous.response) return this.kit.respondSessionRequest({ topic: event.topic, response: previous.response })
        throw new WalletProviderError(-32002, 'This request may already be in progress. Inspect the existing OurPay operation before retrying; it will not be automatically resubmitted.')
      }
      await this.kit.core.storage.setItem(key, { fingerprint } satisfies SavedRequest)
      const chain = Number(chainId.split(':')[1])
      const origin = new URL(session.peer.metadata.url).origin
      const providerKey = `${event.topic}:${chain}`
      let provider = this.#providers.get(providerKey)
      if (!provider) { provider = new OurPayProvider(this.wallet, { ...this.options, origin, chainId: chain }); this.#providers.set(providerKey, provider) }
      const result = await provider.request({ method: request.method, params: request.params })
      response = { id: event.id, jsonrpc: '2.0', result }
    } catch (error) {
      response = { id: event.id, jsonrpc: '2.0', error: { code: error instanceof WalletProviderError ? error.code : -32603, message: error instanceof WalletProviderError ? error.message : 'Wallet request failed. Inspect existing OurPay operations before retrying.' } }
    }
    const previous = await this.kit.core.storage.getItem<SavedRequest>(key)
    if (previous?.fingerprint === fingerprint && !previous.response) await this.kit.core.storage.setItem(key, { fingerprint, response } satisfies SavedRequest)
    await this.kit.respondSessionRequest({ topic: event.topic, response })
  }
}
