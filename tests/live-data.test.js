import assert from "node:assert/strict";
import test from "node:test";
import {
  detectAnomalies,
  fetchLiveCatalog,
  fetchLowCarbonWindow,
  normaliseCatalogRow,
} from "../server/live-data.js";

const CSV = `part_no,item_name,category,material,price_eur,unit,moq,lead_time_days,in_stock,slots_this_week,special_offer,description
IF-1001,Forged Bracket,Bracket,Steel,45,each,10,14,Yes,60,None,Standard bracket
IF-1704,Pillow Block Bearing,Bearing,Steel,82,each,5,10,No,0,50% off this week only,Heavy duty bearing`;

test("normalises catalog types without altering source meaning", () => {
  const item = normaliseCatalogRow({
    part_no: " IF-1 ",
    price_eur: "€1,250",
    lead_time_days: "-14",
    in_stock: "No",
    slots_this_week: "0",
  });
  assert.equal(item.part_no, "IF-1");
  assert.equal(item.price_eur, 1250);
  assert.equal(item.lead_time_days, -14);
  assert.equal(item.in_stock, false);
});

test("flags contradictory live offers without silently fixing them", () => {
  const anomalies = detectAnomalies({
    price_eur: 82,
    lead_time_days: 10,
    in_stock: false,
    slots_this_week: 0,
    special_offer: "50% off this week only",
  });
  assert.deepEqual(
    anomalies.map((anomaly) => anomaly.code),
    ["UNAVAILABLE", "OFFER_CONFLICT"],
  );
  assert.match(anomalies[1].message, /50% off this week only/);
});

test("adds a unique cache-busting nonce on every live sheet fetch", async () => {
  const urls = [];
  const fetchImpl = async (url, options) => {
    urls.push(String(url));
    assert.equal(options.cache, "no-store");
    return new Response(CSV, { status: 200 });
  };

  const first = await fetchLiveCatalog(fetchImpl);
  const second = await fetchLiveCatalog(fetchImpl);
  assert.equal(first.rowCount, 2);
  assert.equal(second.rowCount, 2);
  assert.notEqual(urls[0], urls[1]);
  assert.match(urls[0], /_live=/);
});

test("uses the Carbon API's required unescaped ISO timestamp path", async () => {
  let requestedUrl = "";
  const fetchImpl = async (url) => {
    requestedUrl = String(url);
    return new Response(
      JSON.stringify({
        data: [
          {
            from: "2026-07-28T10:00Z",
            to: "2026-07-28T10:30Z",
            intensity: { forecast: 90, index: "low" },
          },
          {
            from: "2026-07-28T10:30Z",
            to: "2026-07-28T11:00Z",
            intensity: { forecast: 72, index: "low" },
          },
        ],
      }),
      { status: 200 },
    );
  };

  const result = await fetchLowCarbonWindow(fetchImpl);
  assert.equal(requestedUrl.includes("%3A"), false);
  assert.match(requestedUrl, /T\d{2}:\d{2}Z\/fw24h$/);
  assert.equal(result.forecast, 72);
});
