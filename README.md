# Research Assistant

A minimal research assistant that searches the web via Tavily, then synthesizes a cited answer using Groq's hosted LLM API. Frontend is a Vite + React app; backend is a small Express API.

## How it works

1. You submit a query.
2. The backend calls the Tavily Search API (`search_depth: advanced`, top 6 results) to gather sources.
3. The sources are packed into a system prompt with numbered citation markers (`[1]`, `[2]`, ...) and sent to a Groq-hosted model for synthesis.
4. The API returns the synthesized answer plus a clean list of sources (title, URL, domain) so the frontend can render inline citations.

## Project structure

```
.
├── index.html          # Vite entry HTML, loads /src/main.jsx
├── index.js            # Express backend (Tavily + Groq)
├── src/
│   └── main.jsx         # React app entry
├── .env                 # API keys / config (create this — see below)
└── package.json          # Dependencies
```

## Prerequisites

- Node.js 18+ (for native `fetch` support)
- A Groq API key — [console.groq.com](https://console.groq.com) (free tier available)
- A Tavily API key — [tavily.com](https://tavily.com)

## Setup

1. Install dependencies
   ```
   npm install express cors dotenv
   ```

2. If your frontend isn't scaffolded yet:
   ```
   npm create vite@latest . -- --template react
   npm install
   ```

3. Create a `.env` file in the project root:
   ```
   TAVILY_API_KEY=your_tavily_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   PORT=3001
   ```

4. Run the backend
   ```
   node index.js
   ```
   You should see:
   ```
   Research assistant server running on http://localhost:3001
   ```

5. Run the frontend (in a separate terminal)
   ```
   npm run dev
   ```

## API

### `POST /api/research`

**Request body**
```json
{ "query": "What is the latest on X?" }
```

**Response**
```json
{
  "answer": "Synthesized answer text with inline citations like [1][2]...",
  "sources": [
    { "index": 1, "title": "Source Title", "url": "https://...", "domain": "example.com" }
  ]
}
```

If Tavily returns no results, `answer` will contain a fallback message and `sources` will be an empty array.

### `GET /api/health`

Simple health check — returns `{ "ok": true }`.

## Configuration reference

| Env var | Default | Description |
|---|---|---|
| `TAVILY_API_KEY` | *(required)* | Your Tavily search API key |
| `GROQ_API_KEY` | *(required)* | Your Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq-hosted model used for synthesis |
| `PORT` | `3001` | Port the Express server listens on |

## Notes & gotchas

- Unlike a local-model setup, the backend calls out to Groq's API — no local model server needs to be running, so this is deployable as-is (server + frontend) without any local dependencies.
- Citation correctness depends on the model following the system prompt's rules; try `llama-3.1-8b-instant` for faster/cheaper responses or `llama-3.3-70b-versatile` (default) for better citation consistency.
- CORS is open (`app.use(cors())`) — tighten this before deploying anywhere public.
- No request-level input validation beyond checking that `query` is a non-empty string — consider adding rate limiting if this is exposed publicly, since each request costs a Tavily API call (and a Groq call).
- Never commit your `.env` file — make sure it's listed in `.gitignore`.
