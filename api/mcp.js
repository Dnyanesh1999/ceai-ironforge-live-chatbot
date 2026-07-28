import { callMcpTool, TOOL_DEFINITIONS } from "../server/mcp-tools.js";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://dnyanesh1999.github.io",
]);

function setHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

export default async function handler(req, res) {
  setHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    return res.status(200).json({
      name: "ironforge-live-mcp",
      protocolVersion: "2025-03-26",
      transport: "JSON-RPC over HTTPS",
      capabilities: { tools: {} },
      tools: TOOL_DEFINITIONS,
    });
  }
  if (req.method !== "POST") {
    return res.status(405).json(rpcError(null, -32600, "POST required."));
  }

  const { id = null, method, params = {} } = req.body ?? {};

  try {
    if (method === "initialize") {
      return res.status(200).json(
        rpcResult(id, {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "ironforge-live-mcp", version: "1.0.0" },
        }),
      );
    }

    if (method === "notifications/initialized") return res.status(204).end();
    if (method === "tools/list") {
      return res.status(200).json(rpcResult(id, { tools: TOOL_DEFINITIONS }));
    }
    if (method === "tools/call") {
      const result = await callMcpTool(params.name, params.arguments ?? {});
      return res.status(200).json(rpcResult(id, result));
    }

    return res.status(404).json(rpcError(id, -32601, `Method not found: ${method}`));
  } catch (error) {
    return res.status(500).json(rpcError(id, -32000, error.message || "Tool call failed."));
  }
}
