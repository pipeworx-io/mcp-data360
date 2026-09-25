# mcp-data360

World Bank Data360 MCP — the World Bank's modern unified data platform.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `data360_list_databases` | List the source databases aggregated by World Bank Data360 (e.g. WB_WDI = World Development Indicators, IMF_BOP = Balance of Payments, WB_EDSTATS = Education Statistics). Returns each DATABASE_ID with its full name and indicator count. Use a DATABASE_ID here to scope data360_search_indicators and data360_get_data. |
| `data360_search_indicators` | Full-text search across all Data360 indicators (every WDI/IMF/WHO/ILO/education series in one index). Returns indicator codes (use as INDICATOR in data360_get_data), names, owning DATABASE_ID/name, units, and definitions. Optionally restrict to one database with database_id. |
| `data360_get_data` | Fetch observations for one Data360 series. DATABASE_ID selects the source database (e.g. WB_WDI), INDICATOR is the code from data360_search_indicators (e.g. WB_WDI_SP_POP_TOTL), REF_AREA is an ISO3 country code (e.g. BRA, USA). Returns SDMX-style records with OBS_VALUE, TIME_PERIOD, UNIT_MEASURE and disaggregation attributes (SEX, AGE, etc.). Omit TIME_PERIOD for the full series. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "data360": {
      "url": "https://gateway.pipeworx.io/data360/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/data360/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/data360_list_databases \
  -H 'Content-Type: application/json' \
  -d '{"top":200}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/data360_list_databases`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "data360": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-data360"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-data360
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Data360 data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
