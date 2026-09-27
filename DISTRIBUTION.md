# Distribution

OurPay publishes client packages and its own plugin marketplace. Each vendor separately controls its public directory. A repository, a tag or an MCP Registry entry does not confer vendor approval.

| Surface | Distribution route |
| --- | --- |
| MCP-compatible hosts | Hosted OAuth endpoint and official MCP Registry metadata in `server.json` |
| Codex | Public OurPay repository marketplace; global OpenAI listing subject to OpenAI rules |
| Claude Code | Public OurPay repository marketplace; Anthropic directory submission and review are separate |
| Cursor | Native package and public marketplace manifest; official listing requires Cursor review |
| Gemini CLI | Git-installable root extension; gallery discovery follows Google's indexing rules |
| GitHub Copilot CLI | Portable Agent Plugin at the repository root |
| Claude Desktop | Native `.mcpb` release bundle or hosted OAuth connector |
| Other hosts and model frameworks | Configurations and adapters in the integrations release bundle |

OpenAI's [public plugin guidelines](https://developers.openai.com/plugins/app-guidelines) exclude execution of money transfers, crypto transfers and investment trades. The full wallet must not be submitted as an eligible public ChatGPT plugin or described as approved. This guideline was rechecked on September 27, 2026. Custom connectors and external agent integrations have separate availability and policies; technical MCP compatibility does not confer permission or directory eligibility.

Official publication references (check the current requirements before submitting):

- [MCP Registry](https://modelcontextprotocol.io/registry/remote-servers)
- [Codex plugins](https://developers.openai.com/codex/build-plugins)
- [Claude Code distribution](https://code.claude.com/docs/en/plugins/publish)
- [Anthropic directory](https://claude.com/docs/directory/publish)
- [Cursor plugins](https://cursor.com/docs/plugins)
- [Gemini extension releases](https://geminicli.com/docs/extensions/releasing/)

## What is shipped versus what is listed

- A **native package** contains the host manifest, local MCP runtime, branding and agent instructions/references.
- A **client profile** generates configuration for a host's MCP schema; it is not a host-specific plugin or marketplace approval.
- A **model adapter** translates tool schemas/results; the surrounding application still supplies its model, credentials, tool filters and execution loop.
- A **repository marketplace** makes reviewed repository packages installable where the host supports that route.
- An **MCP Registry record** describes the server and transport; it is not approval to appear in every host's search results.
- A **vendor directory listing** requires that vendor's publisher account, eligibility and review. Submission or publisher acceptance does not establish that the plugin is searchable publicly.

The current distribution has six native packages and 18 generated client profiles; see [INTEGRATIONS.md](INTEGRATIONS.md) for the exact list. Names of other assistants or harnesses are not evidence of support. For a new harness, establish whether it supports remote OAuth MCP, local stdio MCP or one of the supplied model formats, then validate that specific integration. Do not claim a native Hermes, Muse, Grokbot or Instinct package without an actual manifest/connection test for that product.

## Maintainer publishing steps

1. Build the public staging tree from the application SDK's `npm run bundle:public`. It includes canonical documentation and generated skill references for every package.
2. Check manifests, runtime version, icon paths, documentation links and source build. A new executable/package release needs a new version/tag and matching checksums.
3. Review the generated diff before synchronizing it into this public repository. Exclude local credentials, wallet state, seed phrases, backend secrets and private deployment artifacts.
4. Publish repository changes and verify CI. For a versioned release, upload the matching archives/checksums and verify the downloaded hashes.
5. Submit to an eligible vendor directory using its official authenticated publisher flow. Record submitted, pending review, approved and publicly searchable as distinct states.
6. Verify the actual listing/install and fresh tool discovery in the relevant host before announcing global availability.

Documentation-only commits can update this repository's main branch and bundled guide files without claiming a new runtime or overwriting released archives. Existing tagged artifacts remain fixed snapshots. Deployment and public-directory publication are separate operations.
