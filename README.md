# ForgeLine — IronForge Components

ForgeLine is a live, source-grounded customer-engagement chatbot built for the
H9CEAI CA2 Build-It-Live assessment. It connects Gemini function calling to a
small Model Context Protocol (MCP) server, retrieves the assigned Google Sheet
at question time, and can combine catalog facts with Great Britain electricity
grid carbon-intensity data.

## Architecture

```text
GitHub Pages React UI
        |
        | POST /api/chat
        v
Vercel chat function -> Gemini Flash function call
        |
        | JSON-RPC tools/call
        v
Vercel MCP endpoint
        |-- live Google Sheet CSV
        `-- UK Carbon Intensity API
```

The catalog is never copied into source code or persisted by the app. Every
catalog tool invocation uses `cache: "no-store"` and a unique query nonce.
Anomaly checks preserve the exact source value, explain why it is questionable,
and recommend human verification.

## Local setup

Requirements: Node.js 20+ and a Gemini API key.

```bash
npm install
cp .env.example .env.local
```

Add `GEMINI_API_KEY` to `.env.local`. Never commit that file. For the complete
frontend + serverless API locally, use the Vercel development server:

```bash
npx vercel dev
```

The Vite-only visual development server remains available with `npm run dev`.

## Checks

```bash
npm run check
```

The tests cover live-fetch cache busting, type normalisation, anomaly detection,
MCP tool publication, catalog search, carbon scope, and the Gemini tool-call
loop.

## MCP endpoint

`GET /api/mcp` publishes discovery information. `POST /api/mcp` accepts
JSON-RPC methods:

- `initialize`
- `tools/list`
- `tools/call`

Published tools:

- `search_live_catalog`
- `inspect_live_part`
- `get_current_carbon_intensity`
- `find_low_carbon_window`

## Deployment

- Frontend: GitHub Pages via `.github/workflows/deploy-pages.yml`
- API and MCP server: Vercel
- Required Vercel environment variables:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL=gemini-3.5-flash-lite`

The Pages workflow builds with
`VITE_API_BASE=https://ceai-ironforge-live-chatbot.vercel.app`.

## CA2 live evidence checklist

The student should personally perform and capture these after deployment:

1. Show the AI disclosure before the first question.
2. Ask a normal part question and capture the answer plus the evidence rail.
3. Edit one harmless cell in the supplied sheet, ask the same question again,
   and capture the changed answer and later fetch time.
4. Restore the lecturer's source value after the proof.
5. Probe each planted anomaly and capture the exact value plus the caveat.
6. Ask for a part and a lower-carbon production window in one question.
7. Capture the public MCP discovery response and the live deployed URL.
8. Check DevTools Network to demonstrate the app calls the backend at question
   time.

Write the required 200–300 word reflection personally. Useful prompts:

- Which design or debugging decision did you make yourself?
- What failed during the live build, and how did you reason through it?
- Why is blindly repeating a spreadsheet contradiction harmful?
- What customer or business risk remains even with source grounding?
- Where and how did you use generative AI?

Do not submit a generic or AI-authored reflection; it should describe your own
live decisions and evidence.

## Data and safety position

The chat is held only in browser memory for the current page session and sent
with each request for short conversational context. The application has no
database and does not intentionally persist chat messages. Users should not
enter personal, confidential, or payment data. Spreadsheet descriptions are
treated as untrusted data, not executable instructions.

## Visual references

The accepted concept images are preserved in:

- `design/concept-desktop.png`
- `design/concept-mobile.png`
