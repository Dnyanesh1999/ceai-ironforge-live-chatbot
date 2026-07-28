import { parse } from "csv-parse/sync";

export const SHEET_VIEW_URL =
  "https://docs.google.com/spreadsheets/d/1q24pjpbT-C6EhVXO2U-Ugjf9rEYyBtIaLXLNMeNYYM4/edit";
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1q24pjpbT-C6EhVXO2U-Ugjf9rEYyBtIaLXLNMeNYYM4/gviz/tq?tqx=out:csv";
export const CARBON_API_URL = "https://api.carbonintensity.org.uk";

const asNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[€,]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const asBoolean = (value) =>
  ["yes", "true", "1", "in stock"].includes(String(value ?? "").trim().toLowerCase());

export function normaliseCatalogRow(raw) {
  return {
    part_no: String(raw.part_no ?? "").trim(),
    item_name: String(raw.item_name ?? "").trim(),
    category: String(raw.category ?? "").trim(),
    material: String(raw.material ?? "").trim(),
    price_eur: asNumber(raw.price_eur),
    unit: String(raw.unit ?? "").trim(),
    moq: asNumber(raw.moq),
    lead_time_days: asNumber(raw.lead_time_days),
    in_stock: asBoolean(raw.in_stock),
    slots_this_week: asNumber(raw.slots_this_week),
    special_offer: String(raw.special_offer ?? "").trim(),
    description: String(raw.description ?? "").trim(),
  };
}

export function detectAnomalies(item) {
  const anomalies = [];

  if (item.price_eur !== null && item.price_eur > 100_000) {
    anomalies.push({
      code: "SUSPECT_PRICE",
      severity: "high",
      message: `The live price is €${item.price_eur.toLocaleString("en-IE")}, which is unusually high and should be verified by a human before purchase.`,
    });
  }

  if (item.lead_time_days !== null && item.lead_time_days < 0) {
    anomalies.push({
      code: "NEGATIVE_LEAD_TIME",
      severity: "high",
      message: `The live lead time is ${item.lead_time_days} days. A negative lead time is not operationally valid and needs human verification.`,
    });
  }

  const unavailable = !item.in_stock || (item.slots_this_week ?? 0) <= 0;
  if (unavailable) {
    anomalies.push({
      code: "UNAVAILABLE",
      severity: "medium",
      message: `The live record reports ${item.in_stock ? "in stock" : "out of stock"} with ${item.slots_this_week ?? 0} production slots this week.`,
    });
  }

  if (unavailable && item.special_offer && !/^none$/i.test(item.special_offer)) {
    anomalies.push({
      code: "OFFER_CONFLICT",
      severity: "high",
      message: `The offer “${item.special_offer}” conflicts with the current availability and should not be presented as actionable without human confirmation.`,
    });
  }

  return anomalies;
}

export async function fetchLiveCatalog(fetchImpl = fetch) {
  const requestedAt = new Date();
  const url = new URL(SHEET_CSV_URL);
  url.searchParams.set("_live", `${requestedAt.getTime()}-${crypto.randomUUID()}`);

  const response = await fetchImpl(url, {
    cache: "no-store",
    headers: {
      Accept: "text/csv",
      "Cache-Control": "no-cache, no-store",
    },
  });

  if (!response.ok) {
    throw new Error(`Live spreadsheet request failed (${response.status}).`);
  }

  const text = await response.text();
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }).map(normaliseCatalogRow);

  if (!rows.length || !rows[0].part_no) {
    throw new Error("The live spreadsheet returned no usable catalog rows.");
  }

  return {
    rows,
    fetchedAt: requestedAt.toISOString(),
    rowCount: rows.length,
    sourceUrl: SHEET_VIEW_URL,
  };
}

export async function fetchCurrentCarbonIntensity(fetchImpl = fetch) {
  const requestedAt = new Date();
  const response = await fetchImpl(`${CARBON_API_URL}/intensity`, {
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });

  if (!response.ok) {
    throw new Error(`Carbon Intensity API request failed (${response.status}).`);
  }

  const payload = await response.json();
  const period = payload?.data?.[0];
  if (!period?.intensity) {
    throw new Error("Carbon Intensity API returned an unexpected response.");
  }

  return {
    from: period.from,
    to: period.to,
    forecast: period.intensity.forecast,
    actual: period.intensity.actual,
    index: period.intensity.index,
    fetchedAt: requestedAt.toISOString(),
    sourceUrl: `${CARBON_API_URL}/`,
    scope: "Great Britain national grid",
  };
}

export async function fetchLowCarbonWindow(fetchImpl = fetch) {
  const requestedAt = new Date();
  const from = `${requestedAt.toISOString().slice(0, 16)}Z`;
  // The Carbon Intensity route expects ISO punctuation in the path. Encoding
  // the colon as %3A causes this public API to reject an otherwise valid time.
  const url = `${CARBON_API_URL}/intensity/${from}/fw24h`;
  const response = await fetchImpl(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });

  if (!response.ok) {
    throw new Error(`Carbon Intensity forecast request failed (${response.status}).`);
  }

  const payload = await response.json();
  const periods = payload?.data ?? [];
  const best = periods
    .filter((period) => Number.isFinite(period?.intensity?.forecast))
    .sort((a, b) => a.intensity.forecast - b.intensity.forecast)[0];

  if (!best) {
    throw new Error("Carbon Intensity API returned no usable 24-hour forecast.");
  }

  return {
    from: best.from,
    to: best.to,
    forecast: best.intensity.forecast,
    index: best.intensity.index,
    fetchedAt: requestedAt.toISOString(),
    sourceUrl: `${CARBON_API_URL}/`,
    scope: "Great Britain national grid",
    caveat:
      "Grid carbon intensity is scheduling context, not the product’s measured carbon footprint.",
  };
}
