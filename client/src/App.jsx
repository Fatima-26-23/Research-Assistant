import { useState, useRef } from 'react';

function parseCitations(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  return paragraphs.map((para) => {
    const parts = [];
    const regex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(para)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: para.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'citation', value: Number(match[1]) });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < para.length) {
      parts.push({ type: 'text', value: para.slice(lastIndex) });
    }
    return parts;
  });
}

function isBullet(para) {
  return /^[-*]\s+/.test(para[0]?.value?.trimStart() || '');
}

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const inputRef = useRef(null);

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveSource(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const paragraphs = result ? parseCitations(result.answer) : [];

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-mark">✿</div>
        <div>
          <h1>Flowy</h1>
          <p className="tagline">A research assistant that shows its sources</p>
        </div>
      </header>

      <form className="search-drawer" onSubmit={runSearch}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question worth citing…"
          aria-label="Research query"
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="error-banner">Something went wrong: {error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-bar" />
          <p>Pulling sources and drafting an answer…</p>
        </div>
      )}

      {result && !loading && (
        <div className="results">
          <main className="answer-column">
            {paragraphs.map((para, i) =>
              isBullet(para) ? (
                <p key={i} className="answer-bullet">
                  {para.map((part, j) =>
                    part.type === 'text' ? (
                      <span key={j}>{part.value.replace(/^[-*]\s+/, '')}</span>
                    ) : (
                      <CitationMark
                        key={j}
                        n={part.value}
                        sources={result.sources}
                        active={activeSource === part.value}
                        onEnter={() => setActiveSource(part.value)}
                        onLeave={() => setActiveSource(null)}
                      />
                    )
                  )}
                </p>
              ) : (
                <p key={i} className="answer-para">
                  {para.map((part, j) =>
                    part.type === 'text' ? (
                      <span key={j}>{part.value}</span>
                    ) : (
                      <CitationMark
                        key={j}
                        n={part.value}
                        sources={result.sources}
                        active={activeSource === part.value}
                        onEnter={() => setActiveSource(part.value)}
                        onLeave={() => setActiveSource(null)}
                      />
                    )
                  )}
                </p>
              )
            )}
          </main>

          <aside className="ledger" aria-label="Sources">
            <h2>Sources</h2>
            <ol>
              {result.sources.map((s) => (
                <li
                  key={s.index}
                  className={activeSource === s.index ? 'ledger-item active' : 'ledger-item'}
                  onMouseEnter={() => setActiveSource(s.index)}
                  onMouseLeave={() => setActiveSource(null)}
                >
                  <a href={s.url} target="_blank" rel="noreferrer">
                    <span className="ledger-index">{s.index}</span>
                    <span className="ledger-body">
                      <span className="ledger-title">{s.title}</span>
                      <span className="ledger-domain">{s.domain}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="empty-state">
          <p>Every answer here comes with a paper trail. Ask something to begin.</p>
        </div>
      )}
    </div>
  );
}

function CitationMark({ n, sources, active, onEnter, onLeave }) {
  const source = sources.find((s) => s.index === n);
  return (
    <a
      href={source?.url || '#'}
      target="_blank"
      rel="noreferrer"
      className={active ? 'citation active' : 'citation'}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      title={source?.title}
    >
      {n}
    </a>
  );
}