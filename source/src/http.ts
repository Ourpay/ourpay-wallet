import { createServer } from 'node:http'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { handleWalletMCP } from './remote.js'

const port = Number(process.env.PORT ?? '8024')
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.')
const apiURL = process.env.OURPAY_API_URL
const resourceURL = process.env.OURPAY_MCP_RESOURCE
if (!apiURL || !resourceURL) throw new Error('OURPAY_API_URL and OURPAY_MCP_RESOURCE are required.')
const config = {
  apiURL, resourceURL,
  allowedHosts: process.env.OURPAY_MCP_ALLOWED_HOSTNAMES?.split(',').map(host => host.trim()).filter(Boolean),
  allowedOriginHosts: process.env.OURPAY_MCP_ORIGIN_HOSTS?.split(',').map(host => host.trim()).filter(Boolean),
}
const handler = toNodeHandler({ fetch: request => handleWalletMCP(request, config) }, {
  onerror: () => process.stderr.write('OurPay Wallet MCP request failed.\n'),
})
const server = createServer((request, response) => { void handler(request, response) })
server.listen(port, process.env.HOST ?? '127.0.0.1', () => process.stdout.write(`OurPay Wallet MCP listening on port ${port}\n`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
})
