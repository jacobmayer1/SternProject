import {Fragment, useState} from 'react'
import './App.css'
import Sources from './Sources'

function App() {
    const [docInfo, setDocInfo] = useState<{ name: string; chunks: number } | null>(null)
    const [uploading, setUploading] = useState(false)
    const [question, setQuestion] = useState<string[]>([])
    const [waiting, setWaiting] = useState(false)
    const [input, setInput] = useState("")
    const [answer, setAnswer] = useState<string[]>([])
    const CITATION = /\[([^[\],]+),\s*p\.\s*([\d,\s]+)\]/g
    type Source = { doc: string; page: number; score: number; text: string }

    const [srcToQuestion, setsrcToQuestion] = useState<{ answer: string; sources: Source[] }[]>([])

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

        let piece = '';
        let answerGivven = false

        let src: Source[] = []
        try {
            const res = await fetch(`http://localhost:8000/chat?question=${encodeURIComponent(userInput)}`, {
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


                const realCitations= citedKeys(piece);


                setsrcToQuestion((prev) => [...prev, {answer: piece, sources: onlyCited(src, realCitations)}])


            }


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
                                    <div className="bubble">{getAnswer(counter)}</div>
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
    )
}

export default App
