import assert from "node:assert/strict";
import test from "node:test";
import { callMcpTool, TOOL_DEFINITIONS } from "../server/mcp-tools.js";

const CSV = `part_no,item_name,category,material,price_eur,unit,moq,lead_time_days,in_stock,slots_this_week,special_offer,description
IF-1501,Forged Mounting Bracket,Bracket,Steel,45,each,10,14,Yes,60,None,General bracket
IF-1702,Titanium Aerospace Fastener,Fastener,Titanium,8823947,each,1,21,Yes,4,None,Aerospace fastener`;

test("publishes the four required MCP tools", () => {
  assert.deepEqual(
    TOOL_DEFINITIONS.map((tool) => tool.name),
    [
      "search_live_catalog",
      "inspect_live_part",
      "get_current_carbon_intensity",
      "find_low_carbon_window",
    ],
  );
});

test("search tool fetches the live sheet and returns typed results", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(CSV, { status: 200 });
  };
  const result = await callMcpTool(
    "search_live_catalog",
    { query: "steel", available_only: true },
    { fetchImpl },
  );
  assert.equal(calls, 1);
  assert.equal(result.structuredContent.items.length, 1);
  assert.equal(result.structuredContent.items[0].part_no, "IF-1501");
});

test("part inspection surfaces extreme live prices", async () => {
  const result = await callMcpTool(
    "inspect_live_part",
    { part_no: "if-1702" },
    { fetchImpl: async () => new Response(CSV, { status: 200 }) },
  );
  assert.equal(result.structuredContent.item.price_eur, 8_823_947);
  assert.equal(result.structuredContent.item.anomalies[0].code, "SUSPECT_PRICE");
});

test("carbon tool labels GB grid scope", async () => {
  const payload = {
    data: [
      {
        from: "2026-07-28T10:00Z",
        to: "2026-07-28T10:30Z",
        intensity: { forecast: 124, actual: 119, index: "low" },
      },
    ],
  };
  const result = await callMcpTool(
    "get_current_carbon_intensity",
    {},
    { fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200 }) },
  );
  assert.equal(result.structuredContent.scope, "Great Britain national grid");
  assert.equal(result.structuredContent.actual, 119);
});
