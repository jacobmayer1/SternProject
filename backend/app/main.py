"""HTTP layer: thin FastAPI endpoints. Logic lives in ingest.py / retrieval.py / store.py."""
import os

from dotenv import load_dotenv

# .env laden, BEVOR die App-Module importiert werden – llm.py und store.py lesen
# ihre Umgebungsvariablen beim Import. In Docker kommen sie über env_file.
load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Response, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse, StreamingResponse  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from app.ingest import ingest_pdf  # noqa: E402
from app.retrieval import answer, compare_models, src  # noqa: E402
from app.store import get_pdf, list_documents, render_pdf, save_pdf  # noqa: E402

app = FastAPI(title="Siteco Doc Chat")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])


class Entry(BaseModel):
    question: str
    models: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
def upload(file: UploadFile):
    pdf_bytes = file.file.read()
    filename = file.filename.removesuffix(".pdf")
    save_pdf(filename, pdf_bytes)
    return ingest_pdf(pdf_bytes, filename)


@app.post("/chat")
def chat(question: str, model: str = ""):
    return StreamingResponse(answer(question, model), media_type="text/plain")


@app.post("/compare")
def compare(entry: Entry):
    return compare_models(entry.question, entry.models)


@app.get("/models")
def models():
    # Auswahl für die Dropdowns im Frontend, konfigurierbar über COMPARE_MODELS in .env
    raw = os.getenv("COMPARE_MODELS", "gpt-4o-mini,gpt-4o,gpt-4.1-mini,gpt-4.1")
    return [m.strip() for m in raw.split(",") if m.strip()]


@app.get("/documents")
def documents():
    # Alle hochgeladenen Dokumente mit Anzahl Chunks: { doc_id: chunks }
    return list_documents()


@app.get("/files")
def files(doc_id: str):
    pdf_path = get_pdf(doc_id.removesuffix(".pdf"))
    if pdf_path is None:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(pdf_path, media_type="application/pdf")


@app.get("/pic")
def pic(filename: str, page: int, citations: list[str] = Query(default=[])):
    png = render_pdf(filename, page, citations)
    if png is None:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=png, media_type="image/png")


@app.get("/sources")
def sources():
    return src
