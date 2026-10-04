import {useState} from "react";

export type Source = { doc: string; page: number; score: number; text: string; terms?: string[] }

type Props = { sources: Source[] }



// Relevanz grob einordnen – Schwellen passend zu text-embedding-3-small (Scores meist 0.1–0.6)
function level(score: number) {
    if (score >= 0.4) return "high"
    if (score >= 0.25) return "mid"
    return "low"
}


export default function Sources({sources}: Props) {
    // Was im Overlay angezeigt wird: das Original-PDF oder (Stufe B) ein gerendertes Seitenbild
    const [preview, setPreview] = useState<{ kind: "pdf" | "image"; url: string } | null>(null)
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
                                    style={{width: `${Math.min(s.score, 1) * 100}%`}}
                                />
                            </div>
                        </div>
                        <p className="source-text">{s.text}…</p>

                        {/* Aktionen: Original-PDF an der Seite öffnen / gerenderte Seite mit Markierungen */}
                        <div className="source-actions">
                            <button type="button" className="source-link"
                                    onClick={() => setPreview({
                                        kind: "pdf",
                                        url: `http://localhost:8000/files?doc_id=${encodeURIComponent(s.doc)}#page=${s.page}`,
                                    })}>
                                Im PDF öffnen
                            </button>
                            <button type="button" className="source-link" onClick={() => {
                                const params = new URLSearchParams({filename: s.doc, page: String(s.page)})
                                s.terms?.forEach((t) => params.append("citations", t))
                                setPreview({kind: "image", url: `http://localhost:8000/pic?${params}`})
                            }}>
                                Seite mit Markierung
                            </button>
                        </div>
                    </div>
                </details>
            ))}


            {preview && (
                // Klick auf den dunklen Hintergrund schließt das Overlay
                <div className="page-modal" role="dialog" aria-label="Quelldokument"
                     onClick={() => setPreview(null)}>
                    {/* stopPropagation: Klicks im Fenster selbst schließen es nicht */}
                    <div className="page-modal-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="page-modal-head">
                            <span className="page-modal-title">
                                {preview.kind === "pdf" ? "Quelldokument" : "Seite mit markierten Fundstellen"}
                            </span>
                            <button type="button" className="page-modal-close" aria-label="Schließen"
                                    onClick={() => setPreview(null)}>✕
                            </button>
                        </div>
                        {preview.kind === "pdf" ? (
                            // Browser-eigener PDF-Viewer; #page=N springt direkt auf die Seite
                            <iframe className="page-modal-frame" src={preview.url} title="Quelldokument"/>
                        ) : (
                            <img className="page-modal-img" src={preview.url}
                                 alt="PDF-Seite mit markierten Fundstellen"/>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
