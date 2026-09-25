import { createHash, randomBytes } from 'node:crypto'
import { mkdir, open, readFile, lstat, link, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { AgentWalletClient, validateAPIURL } from './client.js'

export async function loadConnection(apiURL: string, connectionPath?: string): Promise<AgentWalletClient> {
  const url = validateAPIURL(apiURL)
  const hostID = createHash('sha256').update(url).digest('hex').slice(0, 16)
  const path = connectionPath ?? join(homedir(), '.config', 'ourpay', 'wallets', `${hostID}.json`)
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${randomBytes(16).toString('hex')}.tmp`
  try {
    const file = await open(temporary, 'wx', 0o600)
    try {
      await file.writeFile(JSON.stringify({ apiURL: url, token: `ourpay_aw_${randomBytes(32).toString('base64url')}` }))
      await file.sync()
    } finally { await file.close() }
    await link(temporary, path)
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
  } finally {
    await unlink(temporary).catch(() => undefined)
  }
  const info = await lstat(path)
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw new Error('The wallet connection file must be a private regular file (mode 600).')
  const saved = JSON.parse(await readFile(path, 'utf8')) as { apiURL: string; token: string }
  if (saved.apiURL !== url) throw new Error('This wallet connection belongs to a different OurPay server.')
  return new AgentWalletClient({ apiURL: url, token: saved.token })
}
