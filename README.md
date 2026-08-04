# mcp-data360

World Bank Data360 MCP — the World Bank's modern unified data platform.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Data360 data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
