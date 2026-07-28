import {
  detectAnomalies,
  fetchCurrentCarbonIntensity,
  fetchLiveCatalog,
  fetchLowCarbonWindow,
} from "./live-data.js";

export const TOOL_DEFINITIONS = [
  {
    name: "search_live_catalog",
    description:
      "Fetch the IronForge Google Sheet now and search live parts, prices, availability, lead times, materials, and offers. Use for catalog questions.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words, part number, category, or material." },
        max_price_eur: { type: "number", description: "Optional maximum live unit price." },
        available_only: { type: "boolean", description: "Only return parts currently available." },
        limit: { type: "integer", minimum: 1, maximum: 8, description: "Maximum results." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "inspect_live_part",
    description:
      "Fetch the IronForge Google Sheet now and inspect one exact part number, including anomaly and contradiction checks.",
    inputSchema: {
      type: "object",
      properties: {
        part_no: { type: "string", description: "Exact part number, for example IF-1501." },
      },
      required: ["part_no"],
      additionalProperties: false,
    },
  },
  {
    name: "get_current_carbon_intensity",
    description:
      "Fetch the current Great Britain national electricity-grid carbon intensity from the public Carbon Intensity API.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "find_low_carbon_window",
    description:
      "Fetch the next 24 hours of Great Britain grid carbon forecasts and identify the lowest forecast half-hour for scheduling context.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const toolResponse = (summary, structuredContent) => ({
  content: [{ type: "text", text: summary }],
  structuredContent,
  isError: false,
});

const searchableText = (item) =>
  [
    item.part_no,
    item.item_name,
    item.category,
    item.material,
    item.description,
    item.special_offer,
  ]
    .join(" ")
    .toLowerCase();

export async function callMcpTool(name, args = {}, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  if (name === "search_live_catalog") {
    const live = await fetchLiveCatalog(fetchImpl);
    const terms = String(args.query ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const maxPrice = Number.isFinite(args.max_price_eur) ? args.max_price_eur : Infinity;
    const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 8);

    const items = live.rows
      .filter((item) => terms.every((term) => searchableText(item).includes(term)))
      .filter((item) => item.price_eur !== null && item.price_eur <= maxPrice)
      .filter((item) => !args.available_only || (item.in_stock && item.slots_this_week > 0))
      .slice(0, limit)
      .map((item) => ({ ...item, anomalies: detectAnomalies(item) }));

    return toolResponse(
      `Fetched ${live.rowCount} live spreadsheet rows at ${live.fetchedAt}; ${items.length} matched.`,
      {
        kind: "catalog_search",
        query: String(args.query ?? ""),
        items,
        fetchedAt: live.fetchedAt,
        sourceUrl: live.sourceUrl,
        rowCount: live.rowCount,
      },
    );
  }

  if (name === "inspect_live_part") {
    const live = await fetchLiveCatalog(fetchImpl);
    const requested = String(args.part_no ?? "").trim().toUpperCase();
    const item = live.rows.find((row) => row.part_no.toUpperCase() === requested);

    return toolResponse(
      item
        ? `Fetched ${live.rowCount} live rows and found ${item.part_no} at ${live.fetchedAt}.`
        : `Fetched ${live.rowCount} live rows at ${live.fetchedAt}; ${requested} was not found.`,
      {
        kind: "part_inspection",
        requestedPartNo: requested,
        item: item ? { ...item, anomalies: detectAnomalies(item) } : null,
        fetchedAt: live.fetchedAt,
        sourceUrl: live.sourceUrl,
        rowCount: live.rowCount,
      },
    );
  }

  if (name === "get_current_carbon_intensity") {
    const intensity = await fetchCurrentCarbonIntensity(fetchImpl);
    return toolResponse(
      `Fetched current ${intensity.scope} carbon intensity at ${intensity.fetchedAt}.`,
      { kind: "current_carbon", ...intensity },
    );
  }

  if (name === "find_low_carbon_window") {
    const window = await fetchLowCarbonWindow(fetchImpl);
    return toolResponse(
      `Fetched the live 24-hour forecast; lowest period is ${window.from} to ${window.to}.`,
      { kind: "low_carbon_window", ...window },
    );
  }

  throw new Error(`Unknown MCP tool: ${name}`);
}
