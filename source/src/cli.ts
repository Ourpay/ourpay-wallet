#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { loadConnection } from './connection.js'
import { createWalletMCP } from './mcp.js'

const client = await loadConnection(
  process.env.OURPAY_API_URL ?? 'https://api.ourpay.dev',
  process.env.OURPAY_WALLET_CONNECTION_FILE,
)
await createWalletMCP(client).connect(new StdioServerTransport())
