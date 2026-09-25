#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { integrations, renderConfiguration, type ConfigurationOptions } from './integrations.js'

const help = `OurPay wallet integration setup (Node 24+)

  node configure.mjs --list
  node configure.mjs --target cursor
  node configure.mjs --target codex --transport remote
  node configure.mjs --target all --out ./ourpay-configs

Options: --bundle ABSOLUTE_PATH --node ABSOLUTE_PATH --api-url HTTPS_URL
         --connection-file ABSOLUTE_PATH --transport stdio|remote

Outputs configuration fragments. Merge the ourpay-wallet entry into the host's
existing configuration; existing settings and tool approvals are not changed.
--out creates a NEW directory and refuses to overwrite an existing directory.
For remote OAuth connections, complete approval in the host's browser flow.
`

try {
  const { values } = parseArgs({ options: {
    list: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    target: { type: 'string' }, out: { type: 'string' }, bundle: { type: 'string' },
    node: { type: 'string' }, 'api-url': { type: 'string' },
    'connection-file': { type: 'string' }, transport: { type: 'string', default: 'stdio' },
  } })
  if (values.help || (!values.list && !values.target)) {
    process.stdout.write(help)
  } else if (values.list) {
    process.stdout.write(`${JSON.stringify(integrations, null, 2)}\n`)
  } else {
    if (values.transport !== 'stdio' && values.transport !== 'remote') throw new Error('Transport must be stdio or remote.')
    const options: ConfigurationOptions = {
      bundlePath: values.bundle ?? join(dirname(fileURLToPath(import.meta.url)), 'wallet-mcp.mjs'),
      nodePath: values.node ?? process.execPath,
      apiURL: values['api-url'], connectionFile: values['connection-file'], transport: values.transport,
    }
    if (values.transport === 'stdio') await access(options.bundlePath)
    if (values.target === 'all' && !values.out) throw new Error('--target all requires --out NEW_DIRECTORY.')
    const targets = values.target === 'all'
      ? integrations.filter(target => values.transport !== 'remote' || target.remote).map(target => target.id)
      : [values.target!]
    const files = targets.map(target => ({ target, ...renderConfiguration(target, options) }))
    if (values.out) {
      const directory = resolve(values.out)
      await mkdir(directory)
      for (const file of files) await writeFile(join(directory, `${file.target}.${file.extension}`), file.content, { flag: 'wx' })
      process.stdout.write(`Wrote ${files.length} configurations to ${directory}\n`)
    } else {
      process.stdout.write(files[0].content)
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Configuration could not be generated.'}\n`)
  process.exitCode = 1
}
