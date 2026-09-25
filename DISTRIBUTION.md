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

OpenAI's current [public plugin guidelines](https://developers.openai.com/plugins/app-guidelines) exclude execution of money transfers, crypto transfers and investment trades. The full wallet must not be submitted as an eligible public ChatGPT plugin or described as approved. Custom connectors and external agent integrations have separate availability and policies.

Official publication references checked on September 26, 2026:

- [MCP Registry](https://modelcontextprotocol.io/registry/remote-servers)
- [Codex plugins](https://developers.openai.com/codex/build-plugins)
- [Claude Code distribution](https://code.claude.com/docs/en/plugins/publish)
- [Anthropic directory](https://claude.com/docs/directory/publish)
- [Cursor plugins](https://cursor.com/docs/plugins)
- [Gemini extension releases](https://geminicli.com/docs/extensions/releasing/)
