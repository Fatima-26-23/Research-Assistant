# Research Assistant
 
A minimal research assistant that searches the web via **Tavily**, then synthesizes a cited answer using a **local Ollama** model. Frontend is a Vite + React app; backend is a small Express API.
 
## How it works
 
1. You submit a query.
2. The backend calls the Tavily Search API (`search_depth: advanced`, top 6 results) to gather sources.
3. The sources are packed into a system prompt with numbered citation markers (`[1]`, `[2]`, ...) and sent to a local Ollama model for synthesis.
4. The API returns the synthesized answer plus a clean list of sources (title, URL, domain) so the frontend can render inline citations.
## Project structure
 
```
.
├── index.html          # Vite entry HTML, loads /src/main.jsx
├── index.js            # Express backend (Tavily + Ollama)
├── src/
│   └── main.jsx         # React app entry (not included in this upload)
├── .env                 # API keys / config (create this — see below)
└── package.json          # Dependencies (create/verify — see below)
```
 
> Note: only `index.html` and `index.js` were provided. You'll need a `src/` folder with your React app and a `package.json` for this to run — see [Setup](#setup) below.
 
## Prerequisites
 
- **Node.js** 18+ (for native `fetch` support)
- **Ollama** installed and running locally — [ollama.com](https://ollama.com)
- A pulled Ollama model (default: `llama3.1`)
- A **Tavily API key** — [tavily.com](https://tavily.com)
## Setup
 
1. **Install dependencies**
```bash
   npm install express cors dotenv
```
 
   If your frontend isn't scaffolded yet:
 
```bash
   npm create vite@latest . -- --template react
   npm install
```
 
2. **Create a `.env` file** in the project root:
```env
   TAVILY_API_KEY=your_tavily_api_key_here
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1
   PORT=3001
```
 
3. **Start Ollama and pull the model** (if you haven't already):
```bash
   ollama serve
   ollama pull llama3.1
```
 
4. **Run the backend**
```bash
   node index.js
```
 
   You should see:
```
   Research assistant server running on http://localhost:3001
```
 
5. **Run the frontend** (in a separate terminal, if using Vite):
```bash
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
 
| Env var            | Default                  | Description                              |
|---------------------|---------------------------|-------------------------------------------|
| `TAVILY_API_KEY`    | *(required)*               | Your Tavily search API key                |
| `OLLAMA_BASE_URL`   | `http://localhost:11434`   | Base URL for your local Ollama instance    |
| `OLLAMA_MODEL`      | `llama3.1`                 | Ollama model used for synthesis            |
| `PORT`              | `3001`                     | Port the Express server listens on         |
 
## Notes & gotchas
 
- The backend requires `"ollama serve"` to be running locally — if it's not, `/api/research` will fail with a clear error message telling you to check that the model is pulled and the server is up.
- Citation correctness depends on the model following the system prompt's rules; smaller/faster models may be less consistent about citing every claim.
- CORS is open (`app.use(cors())`) — tighten this before deploying anywhere public.
- No request-level input validation beyond checking that `query` is a non-empty string — consider adding rate limiting if this is exposed publicly, since each request costs a Tavily API call.
