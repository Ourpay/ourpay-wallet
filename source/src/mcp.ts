import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { AgentWalletClient, WalletAPIError, WalletApprovalRequiredError } from './client.js'
import { registerPurchaseTools } from './purchase-tools.js'
import { registerCallTools } from './call-tools.js'
import { registerTradeTools } from './trade-tools.js'
import { registerSignatureTools } from './signature-tools.js'
import { registerExchangeTools } from './exchange-tools.js'
import { registerFundingTools } from './funding-tools.js'
import { registerDappTools } from './dapp-tools.js'

const address = z.string().regex(/^(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/)
const baseUnits = z.string().regex(/^[1-9][0-9]{0,77}$/)
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
const spending = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
const conversionInput = z.object({
  idempotency_key: z.string().uuid(), from_chain_id: z.number().int().positive(),
  from_token: address, from_amount: baseUnits, to_chain_id: z.number().int().positive(),
  to_token: address, min_to_amount: baseUnits, slippage_bps: z.number().int().min(0).max(500).optional(),
  max_network_fee: baseUnits, max_native_value: baseUnits.optional(),
})

export function createWalletMCP(client: AgentWalletClient, options: { provision?: boolean } = {}): McpServer {
  const server = new McpServer({
    name: 'OurPay Wallet', title: 'OurPay Wallet', version: '0.9.1',
    websiteUrl: 'https://wallet.ourpay.dev/agents',
    icons: [{ src: 'https://wallet.ourpay.dev/ourpay-wallet-logo.png', mimeType: 'image/png', sizes: ['512x512'] }],
  })
  const result = async (operation: () => Promise<unknown>) => {
    try {
      return { content: [{ type: 'text' as const, text: JSON.stringify(await operation()) }] }
    } catch (error) {
      if (error instanceof WalletApprovalRequiredError) {
        return { content: [{ type: 'text' as const, text: JSON.stringify(error.approval) }] }
      }
      return {
        isError: true,
        content: [{ type: 'text' as const, text: error instanceof WalletAPIError
          ? error.message : 'The wallet request could not be completed. Retry with the same request ID.' }],
      }
    }
  }

  server.registerTool('ourpay_wallet_approval', {
    description: 'Read an action awaiting owner approval. With Risky mode off, every payment, trade and call needs approval; OurPay emails the owner a review link. Show owner_approval_url and keep the same approval ID. Approval automatically queues the exact action. pending means no execution; approved means queued; submitted returns result_id for the transaction, call batch, swap, trade, purchase or exchange order. Poll that result with its normal tool to confirm settlement. rejected and failed do not authorize another attempt. Quotes and approvals may expire. Agents cannot approve requests or enable Risky mode for owners.',
    inputSchema: z.object({ approval_id: z.string().uuid() }), annotations: readOnly,
  }, ({ approval_id }) => result(() => client.approval(approval_id)))

  server.registerTool('ourpay_wallet', {
    description: 'Open the wallet linked to the owner’s OurPay account. If setup_url is present, show it for the owner to sign in and authorize this agent once. ChatGPT, Claude and other agents use the same wallet when linked to the same account. A connection cannot create an anonymous wallet. With Risky mode off, payments and trades return an approval ID and email the owner before execution; follow ourpay_wallet_approval. Supported actions execute without per-action approval in Risky mode. The returned spending settings show the shared daily USD budget (default $10,000, reset at 00:00 UTC) and Risky mode. Only the owner can raise limits or enable Risky mode in the wallet page. Never ask for, read, or store the recovery phrase; OurPay stores an encrypted backup and account login restores access.',
    inputSchema: z.object({}), annotations: { ...readOnly, readOnlyHint: options.provision === false },
  }, () => result(async () => options.provision === false
    ? { wallet: await client.wallet(), setup_url: null }
    : client.provision()))

  server.registerTool('ourpay_wallet_networks', {
    description: 'List configured EVM and Solana networks, native asset addresses/decimals, fee models and a starter token list. The starter list is not an asset allowlist: use assets to discover other tokens by exact contract/mint. HYPE on HyperEVM is distinct from a Hyperliquid exchange balance. Route availability depends on liquidity. Before submitting on-chain actions, check native fees and use ourpay_wallet_prepare_funding to obtain missing gas from existing supported USDC.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.networks()))

  server.registerTool('ourpay_wallet_addresses', {
    description: 'Get this same recoverable wallet’s EVM and Solana funding addresses. Use the address matching the network family. Never send SOL/SPL assets to an EVM address. Both keys derive from the owner’s existing backup; private keys and the recovery phrase are never returned.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.addresses()))

  server.registerTool('ourpay_wallet_assets', {
    description: 'Discover token metadata for an enabled chain, including tokens beyond USDC. Search by symbol or exact EVM contract/Solana mint. Symbols are ambiguous: confirm the exact chain and address, and use returned decimals for amounts. Native ETH/HYPE/SOL uses the network’s native_token address. A listed asset is not a guarantee of a liquid route.',
    inputSchema: z.object({ chain_id: z.number().int().positive(), search: z.string().max(100).optional(), limit: z.number().int().min(1).max(100).optional() }), annotations: readOnly,
  }, ({ chain_id, search, limit }) => result(() => client.assets(chain_id, search, limit)))

  server.registerTool('ourpay_wallet_balance', {
    description: 'Read an EVM or Solana asset balance and native funds for fees. Amounts are integer base units. Use native_token from networks for the native asset; Solana addresses and mints are case-sensitive.',
    inputSchema: z.object({ chain_id: z.number().int().positive(), token: address }), annotations: readOnly,
  }, ({ chain_id, token }) => result(() => client.balance(chain_id, token)))

  server.registerTool('ourpay_wallet_transfer', {
    description: 'Send an exact asset amount to a recipient under the owner’s spending authorization. Check native gas first; use ourpay_wallet_prepare_funding and confirm delivery if needed. Amounts are integer base units, not dollars. Generate a UUID idempotency_key once and reuse it on every retry. A signed or broadcast result is pending, not a successful payment. Resume and check the transaction until confirmed. Solana requires max_network_fee in lamports including account rent. OP Stack fee limits check estimates; inclusion-time data/operator charges may change.',
    inputSchema: z.object({
      idempotency_key: z.string().uuid(), chain_id: z.number().int().positive(),
      token: address, recipient: address, amount: baseUnits, max_network_fee: baseUnits.optional(),
    }), annotations: spending,
  }, (data) => result(() => client.transfer(data)))

  server.registerTool('ourpay_wallet_transactions', {
    description: 'Read recent wallet transactions, confirmed transfers and pending requests.',
    inputSchema: z.object({}), annotations: readOnly,
  }, () => result(() => client.transactions()))

  server.registerTool('ourpay_wallet_transaction', {
    description: 'Read one transaction status and its network hash. Only confirmed means the transfer has settled.',
    inputSchema: z.object({ transaction_id: z.string().uuid() }), annotations: readOnly,
  }, ({ transaction_id }) => result(() => client.transaction(transaction_id)))

  server.registerTool('ourpay_wallet_resume_transaction', {
    description: 'Resume submission or reconciliation of an existing transaction. Reuses its original signed transaction and hash; it never creates another transfer. Use this after a timeout or a pending result.',
    inputSchema: z.object({ transaction_id: z.string().uuid() }), annotations: spending,
  }, ({ transaction_id }) => result(() => client.resume(transaction_id)))

  server.registerTool('ourpay_wallet_quote_swap', {
    description: 'Quote an exact-input token conversion, including bridging between configured chains. Check source gas first and prepare missing gas with ourpay_wallet_prepare_funding before this quote. Tokens arrive in the same wallet. Amounts use the individual token’s integer base units. min_to_amount must cover the merchant requirement. max_network_fee bounds each approval or swap fee estimate in source-native base units; OP Stack inclusion-time data/operator charges may change; max_native_value caps additional bridge charges. Reuse the UUID idempotency_key on retries. This tool obtains a quote without spending.',
    inputSchema: conversionInput, annotations: { ...readOnly, readOnlyHint: false },
  }, (data) => result(() => client.quoteSwap(data)))

  server.registerTool('ourpay_wallet_convert', {
    description: 'Automatically quote and start an authorized same-chain swap or cross-chain bridge into the required asset in this same wallet, including EVM native tokens and Solana assets where routes exist. Discover exact chain/token addresses and check source gas first. Use ourpay_wallet_prepare_funding and confirm missing gas before conversion. Specify the source amount, minimum destination amount, slippage, maximum source-native network fee and extra bridge/account-rent allowance. Solana uses lamports. OP Stack inclusion-time data/operator charges may exceed a preflight estimate. Keep the same UUID across every retry. Only use with existing owner spending authorization; restricted EVM trading sessions must use trade tools. This returns durable progress, not instant settlement: poll swap until confirmed and never issue a second conversion because a bridge is slow.',
    inputSchema: conversionInput, annotations: spending,
  }, data => result(() => client.convert(data)))

  server.registerTool('ourpay_wallet_execute_swap', {
    description: 'Execute or resume an existing quote using the owner’s spending authorization. Approves only the exact input amount and retains transaction IDs across retries. Confirmation requires the expected destination token in this wallet. A bridging or needs_attention result is not a completed purchase.',
    inputSchema: z.object({ swap_id: z.string().uuid() }), annotations: spending,
  }, ({ swap_id }) => result(() => client.executeSwap(swap_id)))

  server.registerTool('ourpay_wallet_swap', {
    description: 'Check token conversion and cross-chain settlement. Only confirmed means the expected token and minimum amount were verified on the destination network.',
    inputSchema: z.object({ swap_id: z.string().uuid() }), annotations: readOnly,
  }, ({ swap_id }) => result(() => client.swap(swap_id)))
  registerPurchaseTools(server, client, result)
  registerCallTools(server, client, result)
  registerTradeTools(server, client, result)
  registerSignatureTools(server, client, result)
  registerExchangeTools(server, client, result)
  registerDappTools(server, client, result)
  registerFundingTools(server, client, result)
  return server
}
