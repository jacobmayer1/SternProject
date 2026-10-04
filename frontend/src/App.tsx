import {Fragment, useEffect, useState} from 'react'
import './App.css'
import Sources from './Sources'
import remarkGfm from "remark-gfm";
import ReactMarkdown from 'react-markdown';

function App() {
    const [docInfo, setDocInfo] = useState<{ name: string; chunks: number } | null>(null)
    const [uploading, setUploading] = useState(false)
    const [question, setQuestion] = useState<string[]>([])
    const [waiting, setWaiting] = useState(false)
    const [input, setInput] = useState("")
    const [answer, setAnswer] = useState<string[]>([])
    const CITATION = /\[([^[\],]+),\s*p\.\s*([\d,\s]+)\]/g
    type Source = { doc: string; page: number; score: number; text: string }

    type ModelAnswer = { model: string; text: string; ms: number }

    const [srcToQuestion, setsrcToQuestion] = useState<{
        answer: string;
        sources: Source[];
        compare?: ModelAnswer[]
    }[]>([])

    // ---------- Modellvergleich ----------
    const [compareMode, setCompareMode] = useState(false)
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [modelA, setModelA] = useState("")
    const [modelB, setModelB] = useState("")


    //-----------Modell auswählen ---------

    const [changeModel, setChangeModel] = useState(false)
    const [model, setModel] = useState("gpt-4o-mini")

    //-----------Hochgeladene Dokumente (rechte Sidebar) ---------

    // Backend liefert ein Dict { doc_id: anzahlChunks }
    const [documents, setDocuments] = useState<Record<string, number>>({})

    function loadDocuments() {
        fetch("http://localhost:8000/documents")
            .then((res) => res.json())
            .then((docs: Record<string, number>) => setDocuments(docs))
            .catch(() => setDocuments({}))
    }

    // einmal beim Start laden
    useEffect(() => {
        loadDocuments()
    }, [])

    // Modellliste einmal beim Start vom Backend holen (konfigurierbar über COMPARE_MODELS)
    useEffect(() => {
        fetch("http://localhost:8000/models")
            .then((res) => res.json())
            .then((models: string[]) => {
                setAvailableModels(models)
                setModelA(models[0] ?? "")
                setModelB(models[1] ?? models[0] ?? "")
            })
            .catch(() => setAvailableModels([]))
    }, [])

    async function upload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append("file", file)          // "file" = Parametername im Backend

        setUploading(true)
        try {
            const res = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData,                     // KEIN Content-Type setzen, das macht der Browser
            })
            if (!res.ok) throw new Error(`Upload fehlgeschlagen: ${res.status}`)
            const chunks: number = await res.json()
            setDocInfo({name: file.name, chunks})
            loadDocuments()                       // Liste rechts aktualisieren
        } catch (err) {
            alert(String(err))
        } finally {
            setUploading(false)
            e.target.value = ""                   // gleiche Datei nochmal wählbar
        }
    }


    async function chat(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()                    // verhindert, dass der Browser die Seite neu lädt

        const userInput = input.trim()
        if (!userInput) return
        setInput("")                          // Eingabefeld leeren
        setQuestion((prev) => [...prev, userInput])
        setWaiting(true)

        if (compareMode) {
            await compareChat(userInput)
            return
        }

        let piece = '';
        let answerGivven = false

        console.log(model)

        let src: Source[] = []
        try {
            const res = await fetch(`http://localhost:8000/chat?question=${encodeURIComponent(userInput)}&model=${encodeURIComponent(model)}`, {
                method: "POST",
            })
            if (!res.ok) throw new Error(`chat fehlgeschlagen: ${res.status}`)
            const reader = res.body!.getReader()
            const decoder = new TextDecoder()


            while (true) {
                const {done, value} = await reader.read()
                if (done) break
                piece += decoder.decode(value)
            }

            if (piece != '') {
                answerGivven = true
            }


        } catch
            (err) {
            alert(String(err))


        } finally {
            if (answerGivven) {
                setAnswer((prev) => [...prev, piece])
                setWaiting(false)
                src = await getSources()


                const realCitations = citedKeys(piece);


                setsrcToQuestion((prev) => [...prev, {answer: piece, sources: onlyCited(src, realCitations)}])


            }


        }
    }


    // Vergleichsmodus: eine Anfrage an /compare, Backend macht Retrieval einmal
    // und fragt beide Modelle parallel mit identischem Kontext.
    async function compareChat(userInput: string) {
        try {
            const res = await fetch("http://localhost:8000/compare", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({question: userInput, models: [modelA, modelB]}),
            })
            if (!res.ok) throw new Error(`compare fehlgeschlagen: ${res.status}`)
            const data: { sources: Source[]; answers: ModelAnswer[] } = await res.json()

            // Quellen, die in IRGENDEINER der Antworten zitiert wurden
            const cited = citedKeys(data.answers.map((a) => a.text).join("\n"))
            const first = data.answers[0]?.text ?? ""

            // answer[] mitführen, damit die Indizes von question/answer/srcToQuestion gleich bleiben
            setAnswer((prev) => [...prev, first])
            setsrcToQuestion((prev) => [...prev, {
                answer: first,
                sources: onlyCited(data.sources, cited),
                compare: data.answers,
            }])
        } catch (err) {
            alert(String(err))
            setAnswer((prev) => [...prev, "Fehler beim Modellvergleich."])
            setsrcToQuestion((prev) => [...prev, {answer: "", sources: []}])
        } finally {
            setWaiting(false)
        }
    }

    // Liest alle Zitate wie [doc, p. 26] oder [doc, p. 3, 26] aus der Antwort.
    // Rückgabe: Set von Strings "doc|seite" – Strings statt Objekte, weil Set.has()
    // bei Objekten nur die Referenz vergleicht und nie einen Treffer finden würde.
    function citedKeys(answer: string): Set<string> {
        const keys = new Set<string>()
        for (const m of answer.matchAll(CITATION)) {
            const doc = m[1].trim()
            for (const page of m[2].split(",")) {
                const p = page.trim()
                if (p) keys.add(`${doc}|${p}`)
            }
        }
        return keys
    }

    // Behält nur die Quellen, die in der Antwort tatsächlich zitiert wurden.
    function onlyCited(sources: Source[], cited: Set<string>): Source[] {
        return sources.filter((s) => cited.has(`${s.doc}|${s.page}`))
    }

    async function getSources(): Promise<Source[]> {

        let sources: Source[] = []

        try {
            const res = await fetch(`http://localhost:8000/sources`, {
                method: "GET",
            })
            if (!res.ok) throw new Error(`chat fehlgeschlagen: ${res.status}`)
            const reader = await res.json()

            console.log(reader)
            sources = reader


        } catch
            (err) {
            alert(String(err))


        }

        return sources


    }

    function getAnswer(counter: number) {

        if (answer.length > counter) {

            return answer[counter]
        }

        return ''
    }

    return (
        <div className="shell">
            {/* ---------- Sidebar: Modellvergleich ---------- */}
            <aside className="sidebar">
                <span className="eyebrow">Einstellungen</span>

                <span className="eyebrow">Benutztes Modell: {model}</span>

                <label className="switch-row">
                    <span>Modelle vergleichen</span>
                    <span className="switch">
                        <input
                            type="checkbox"
                            checked={compareMode}
                            onChange={(e) => setCompareMode(e.target.checked)}
                        />
                        <span className="slider"/>
                    </span>
                </label>

                {compareMode && (
                    <div className="model-picks">
                        <label className="field">
                            <span>Modell A</span>
                            <select value={modelA} onChange={(e) => setModelA(e.target.value)}>
                                {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </label>
                        <label className="field">
                            <span>Modell B</span>
                            <select value={modelB} onChange={(e) => setModelB(e.target.value)}>
                                {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </label>
                        <p className="hint">
                            Beide Modelle bekommen denselben Kontext – Retrieval läuft nur einmal.
                        </p>
                    </div>
                )}

                <label className="switch-row">
                    <span>Modelle tauschen</span>
                    <span className="switch">

                        <input
                            type="checkbox"
                            checked={changeModel}
                            onChange={(e) => setChangeModel(e.target.checked)}
                        />
                        <span className="slider"/>
                    </span>
                </label>

                {changeModel && (
                    <div className="model-picks">
                        <label className="field">
                            <span>Modell</span>
                            <select value={model} onChange={(e) => setModel(e.target.value)}>
                                {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </label>
                    </div>
                )}


            </aside>

            <div className="app">
            {/* ---------- Header: Titel + PDF-Upload ---------- */}
                <header className="header">
                    <div className="brand">
                        <span className="eyebrow">Retrieval-Augmented Q&amp;A</span>
                        <h1>Document Chat</h1>
                    </div>

                    <div className="upload">
                        {docInfo && <span className="doc-chip">{docInfo.name} · {docInfo.chunks} Chunks</span>}

                        {/* Das <label> ist der sichtbare Button, das <input> ist versteckt */}
                        <label className="btn btn-outline">
                            {uploading ? "Lädt…" : "PDF hochladen"}
                            <input type="file" accept=".pdf" onChange={upload}/>
                        </label>
                    </div>
                </header>

                {/* ---------- Nachrichten ---------- */}
                <main className="messages">


                    {question.map((text, counter) => (
                        <Fragment key={counter}>
                            <div className="message user">
                                <div className="bubble">{text}</div>
                            </div>
                            {getAnswer(counter) && (
                                <div className="message assistant">
                                    <div className="assistant-col">
                                        {srcToQuestion[counter]?.compare ? (
                                            <div className="compare-grid">
                                                {srcToQuestion[counter].compare!.map((a) => (
                                                    <div key={a.model} className="compare-col">
                                                        <div className="compare-head">
                                                            <span className="compare-model">{a.model}</span>
                                                            <span
                                                                className="compare-ms">{(a.ms / 1000).toFixed(1)} s</span>
                                                        </div>
                                                        <div className="bubble markdown">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}>{a.text}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bubble markdown">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}>{getAnswer(counter)}</ReactMarkdown>
                                            </div>
                                        )}
                                        <Sources sources={srcToQuestion[counter]?.sources ?? []}/>
                                    </div>
                                </div>
                            )}
                        </Fragment>
                    ))}


                    <div className="message assistant">
                        <div className="bubble typing" hidden={!waiting}>Antwort wird geschrieben…</div>
                    </div>
                </main>

                {/* ---------- Eingabe ---------- */}
                <form className="composer" onSubmit={chat}>
                    <input
                        type="text"
                        placeholder="Frage zum Dokument stellen…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" className="btn">Senden</button>
                </form>
            </div>

            {/* ---------- Sidebar rechts: hochgeladene Dokumente ---------- */}
            <aside className="sidebar sidebar-right">
                <span className="eyebrow">Dokumente</span>

                {Object.keys(documents).length === 0 ? (
                    <p className="hint">Noch keine Dokumente hochgeladen.</p>
                ) : (
                    <ul className="doc-list">
                        {Object.entries(documents)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([docId, chunks]) => (
                                <li key={docId} className="doc-item">
                                    <span className="doc-name" title={docId}>{docId}</span>
                                    <span className="doc-meta">{chunks} Chunks</span>
                                </li>
                            ))}
                    </ul>
                )}
            </aside>
        </div>
    )
}

export default App
