import { runGeminiConversation } from "../server/gemini.js";

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

const cleanMessages = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .slice(-12)
    .filter(
      (message) =>
        ["user", "assistant"].includes(message?.role) && typeof message?.content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4_000),
    }))
    .filter((message) => message.content);

function ownOrigin(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

async function callMcpOverHttp(req, name, args) {
  const response = await fetch(`${ownOrigin(req)}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || `MCP tool ${name} failed.`);
  }
  return payload.result;
}

export default async function handler(req, res) {
  setHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST required." });

  const messages = cleanMessages(req.body?.messages);
  if (!messages.length || messages.at(-1).role !== "user") {
    return res.status(400).json({ error: "A final user message is required." });
  }

  try {
    const result = await runGeminiConversation({
      messages,
      callTool: (name, args) => callMcpOverHttp(req, name, args),
    });
    const sources = result.toolResults.map((tool) => {
      const data = tool.output?.structuredContent ?? {};
      return {
        tool: tool.name,
        fetchedAt: data.fetchedAt,
        sourceUrl: data.sourceUrl,
        rowCount: data.rowCount,
        scope: data.scope,
      };
    });
    return res.status(200).json({
      reply: result.reply,
      model: result.model,
      toolCalls: result.toolResults.map(({ name, arguments: input }) => ({ name, input })),
      sources,
    });
  } catch (error) {
    console.error("ForgeLine chat request failed:", error?.message || error);
    const missingKey = error.message.includes("GEMINI_API_KEY");
    return res.status(missingKey ? 503 : 502).json({
      error: missingKey
        ? "The AI service is not configured yet."
        : "I could not complete a live, verified answer. Please try again.",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
