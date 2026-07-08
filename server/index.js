import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: 6,
      include_answer: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.results || []).map((r, i) => ({
    index: i + 1,
    title: r.title,
    url: r.url,
    content: r.content,
    domain: (() => {
      try {
        return new URL(r.url).hostname.replace('www.', '');
      } catch {
        return r.url;
      }
    })(),
  }));
}

async function synthesizeAnswer(query, sources) {
  const sourceBlock = sources
    .map((s) => `[${s.index}] ${s.title}\nURL: ${s.url}\nContent: ${s.content}`)
    .join('\n\n');

  const systemPrompt = `You are a research assistant. Answer the user's question using ONLY the numbered sources provided below. 
Rules:
- Cite claims inline using bracketed numbers like [1] or [2][3] that match the source list.
- Every non-obvious factual claim must have at least one citation.
- If sources disagree, note the disagreement and cite both.
- If the sources don't fully answer the question, say so plainly.
- Do not fabricate sources or facts not present below.
- Keep the answer well-organized and concise (short paragraphs or a few bullet points).

SOURCES:
${sourceBlock}`;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ollama request failed (${res.status}): ${text}. Is "ollama serve" running and is the model pulled?`
    );
  }

  const data = await res.json();
  return data.message?.content || '';
}

app.post('/api/research', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'A "query" string is required.' });
  }

  try {
    const sources = await tavilySearch(query.trim());

    if (sources.length === 0) {
      return res.json({
        answer: "I couldn't find any sources for that query. Try rephrasing it.",
        sources: [],
      });
    }

    const answer = await synthesizeAnswer(query.trim(), sources);

    res.json({
      answer,
      sources: sources.map(({ index, title, url, domain }) => ({ index, title, url, domain })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Research assistant server running on http://localhost:${PORT}`));
