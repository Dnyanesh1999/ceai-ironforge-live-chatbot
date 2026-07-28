import assert from "node:assert/strict";
import test from "node:test";
import { runGeminiConversation } from "../server/gemini.js";

test("routes a data question through a tool before returning an answer", async () => {
  const responses = [
    {
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ functionCall: { name: "inspect_live_part", args: { part_no: "IF-1703" } } }],
          },
        },
      ],
    },
    {
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text: "The live lead time is -14 days and needs verification." }],
          },
        },
      ],
    },
  ];
  const requestBodies = [];
  const fetchImpl = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify(responses.shift()), { status: 200 });
  };
  const calls = [];
  const toolOutput = {
    content: [{ type: "text", text: "Found live row." }],
    structuredContent: {
      kind: "part_inspection",
      fetchedAt: "2026-07-28T10:00:00.000Z",
      sourceUrl: "https://example.com/sheet",
      item: {
        part_no: "IF-1703",
        lead_time_days: -14,
        anomalies: [
          {
            code: "NEGATIVE_LEAD_TIME",
            message:
              "The live lead time is -14 days. A negative lead time is not operationally valid and needs human verification.",
          },
        ],
      },
    },
  };

  const result = await runGeminiConversation({
    messages: [{ role: "user", content: "What is the lead time for IF-1703?" }],
    apiKey: "test-key",
    fetchImpl,
    callTool: async (name, args) => {
      calls.push({ name, args });
      return toolOutput;
    },
  });

  assert.equal(calls[0].name, "inspect_live_part");
  assert.equal(requestBodies[0].toolConfig.functionCallingConfig.mode, "ANY");
  assert.equal(requestBodies[1].toolConfig.functionCallingConfig.mode, "NONE");
  assert.equal(JSON.stringify(requestBodies[0]).includes("additionalProperties"), false);
  assert.match(result.reply, /-14 days/);
  assert.equal(result.toolResults.length, 1);
});
