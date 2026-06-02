interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * World Bank Data360 MCP — the World Bank's modern unified data platform.
 *
 * Data360 (data360api.worldbank.org) aggregates 90+ international databases —
 * World Development Indicators (WB_WDI), IMF Balance of Payments (IMF_BOP),
 * WHO, ILO, UNESCO Education Stats, Gender Stats, Global Findex, and more —
 * behind ONE SDMX-style API. A series is addressed by (DATABASE_ID, INDICATOR,
 * REF_AREA): DATABASE_ID picks the source database, INDICATOR is the code from
 * search_indicators, REF_AREA is an ISO3 country code. This is the newer/broader
 * successor to the legacy World Bank v2 indicators API.
 */


const BASE = 'https://data360api.worldbank.org/data360';
const UA = 'pipeworx-mcp-data360/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'data360_list_databases',
    description:
      'List the source databases aggregated by World Bank Data360 (e.g. WB_WDI = World Development Indicators, IMF_BOP = Balance of Payments, WB_EDSTATS = Education Statistics). Returns each DATABASE_ID with its full name and indicator count. Use a DATABASE_ID here to scope data360_search_indicators and data360_get_data.',
    inputSchema: {
      type: 'object',
      properties: {
        top: { type: 'number', description: 'Max databases to return (default 200, the full list).' },
      },
    },
  },
  {
    name: 'data360_search_indicators',
    description:
      'Full-text search across all Data360 indicators (every WDI/IMF/WHO/ILO/education series in one index). Returns indicator codes (use as INDICATOR in data360_get_data), names, owning DATABASE_ID/name, units, and definitions. Optionally restrict to one database with database_id.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword(s), e.g. "GDP per capita" or "maternal mortality". Use "*" for all.' },
        database_id: { type: 'string', description: 'Optional: restrict to one source database, e.g. "WB_WDI" or "IMF_BOP" (from data360_list_databases).' },
        top: { type: 'number', description: 'Max results (default 20).' },
        skip: { type: 'number', description: 'Offset for pagination (default 0).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'data360_get_data',
    description:
      'Fetch observations for one Data360 series. DATABASE_ID selects the source database (e.g. WB_WDI), INDICATOR is the code from data360_search_indicators (e.g. WB_WDI_SP_POP_TOTL), REF_AREA is an ISO3 country code (e.g. BRA, USA). Returns SDMX-style records with OBS_VALUE, TIME_PERIOD, UNIT_MEASURE and disaggregation attributes (SEX, AGE, etc.). Omit TIME_PERIOD for the full series.',
    inputSchema: {
      type: 'object',
      properties: {
        DATABASE_ID: { type: 'string', description: 'Source database ID, e.g. "WB_WDI".' },
        INDICATOR: { type: 'string', description: 'Indicator code, e.g. "WB_WDI_SP_POP_TOTL".' },
        REF_AREA: { type: 'string', description: 'ISO3 country/region code, e.g. "BRA", "USA", "WLD".' },
        TIME_PERIOD: { type: 'string', description: 'Optional single year, e.g. "2020".' },
        skip: { type: 'number', description: 'Offset for pagination (default 0).' },
        top: { type: 'number', description: 'Max observations to return (default 100).' },
      },
      required: ['DATABASE_ID', 'INDICATOR', 'REF_AREA'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'data360_list_databases': {
      const top = numArg(args.top, 200);
      const body = {
        count: true,
        search: '*',
        top: 0,
        facets: [`series_description/database_id,count:${top}`, `series_description/database_name,count:${top}`],
      };
      const res = await searchPost(body);
      const facets = (res as any)?.['@search.facets'] ?? {};
      const ids: Array<{ value: string; count: number }> = facets['series_description/database_id'] ?? [];
      const names: Array<{ value: string; count: number }> = facets['series_description/database_name'] ?? [];
      const nameById = new Map<number, string>();
      names.forEach((n, i) => nameById.set(i, n.value));
      const databases = ids.map((d, i) => ({
        database_id: d.value,
        database_name: names[i]?.value ?? null,
        indicator_count: d.count,
      }));
      return { count: databases.length, databases };
    }

    case 'data360_search_indicators': {
      const query = reqStr(args, 'query', '"GDP per capita"');
      const databaseId = optStr(args.database_id);
      const top = numArg(args.top, 20);
      const skip = numArg(args.skip, 0);
      const body: Record<string, unknown> = { count: true, search: query, top, skip };
      if (databaseId) body.filter = `series_description/database_id eq '${databaseId.replace(/'/g, "''")}'`;
      const res = (await searchPost(body)) as any;
      const indicators = (res?.value ?? []).map((v: any) => {
        const sd = v.series_description ?? {};
        return {
          indicator: sd.idno ?? null,
          name: sd.name ?? null,
          database_id: sd.database_id ?? null,
          database_name: sd.database_name ?? null,
          measurement_unit: sd.measurement_unit ?? null,
          periodicity: sd.periodicity ?? null,
          definition: sd.definition_long ?? sd.definition_short ?? null,
        };
      });
      return { count: res?.['@odata.count'] ?? indicators.length, indicators };
    }

    case 'data360_get_data': {
      const params = new URLSearchParams();
      params.set('DATABASE_ID', reqStr(args, 'DATABASE_ID', '"WB_WDI"'));
      params.set('INDICATOR', reqStr(args, 'INDICATOR', '"WB_WDI_SP_POP_TOTL"'));
      params.set('REF_AREA', reqStr(args, 'REF_AREA', '"BRA"'));
      const period = optStr(args.TIME_PERIOD);
      if (period) params.set('TIME_PERIOD', period);
      params.set('skip', String(numArg(args.skip, 0)));
      params.set('top', String(numArg(args.top, 100)));
      return get(`/data?${params.toString()}`);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function searchPost(body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}/searchv2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Data360: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Data360: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v.trim();
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function numArg(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
