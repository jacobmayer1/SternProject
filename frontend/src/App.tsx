import {Fragment, useState} from 'react'
import './App.css'

function App() {
    const [docInfo, setDocInfo] = useState<{ name: string; chunks: number } | null>(null)
    const [uploading, setUploading] = useState(false)
    const [question, setQuestion] = useState<string[]>([])
    const [waiting, setWaiting] = useState(false)
    const [input, setInput] = useState("")
    const [answer, setAnswer] = useState<string[]>([])

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
            console.log(piece)

        } catch
            (err) {
            alert(String(err))


        } finally {
            if (answerGivven) {
                setAnswer((prev) => [...prev, piece])
                setWaiting(false)

            }


        }
    }

    function getAnswer(counter: number) {

        if(answer.length > counter){

            return answer[counter]
        }

        return ''
    }

    return (
        <div className="app">
            {/* ---------- Header: Titel + PDF-Upload ---------- */}
            <header className="header">
                <div>
                    <h1>Document Chat</h1>
                    <p>Lade ein PDF hoch und stell Fragen dazu.</p>
                </div>

                <div className="upload">
                    {/* TODO: nur anzeigen, wenn ein Dokument hochgeladen ist */}
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
                                <div className="bubble">{getAnswer(counter)}</div>
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
