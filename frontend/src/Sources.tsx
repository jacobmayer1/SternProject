export type Source = { doc: string; page: number; score: number; text: string }

type Props = { sources: Source[] }

// Relevanz grob einordnen – Schwellen passend zu text-embedding-3-small (Scores meist 0.1–0.6)
function level(score: number) {
  if (score >= 0.4) return "high"
  if (score >= 0.25) return "mid"
  return "low"
}

export default function Sources({ sources }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="sources">
      <div className="sources-title">{sources.length} zitierte {sources.length === 1 ? "Quelle" : "Quellen"}</div>

      {sources.map((s, i) => (
        // <details>/<summary> ist ein natives Akkordeon: Klick auf summary klappt auf/zu
        <details key={i} className="source">
          <summary>
            <span className="source-page">S. {s.page}</span>
            <span className="source-doc">{s.doc}</span>
            <span className={`source-score ${level(s.score)}`}>{s.score.toFixed(2)}</span>
          </summary>

          <div className="source-body">
            <div className="score-row">
              <span>Relevanz</span>
              <div className="score-bar">
                <div
                  className={`score-fill ${level(s.score)}`}
                  style={{ width: `${Math.min(s.score, 1) * 100}%` }}
                />
              </div>
            </div>
            <p className="source-text">{s.text}…</p>
          </div>
        </details>
      ))}
    </div>
  )
}
