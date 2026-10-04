"""HTTP layer: thin FastAPI endpoints. Logic lives in ingest.py / retrieval.py."""
import os


from dotenv import load_dotenv
from starlette.responses import StreamingResponse

from app.ingest import ingest_pdf
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.store import list_documents

from app.retrieval import answer, compare_models, src

load_dotenv()  # local dev: reads ../.env or .env; in Docker env_file is used

from fastapi import FastAPI, UploadFile  # noqa: E402

app = FastAPI(title="Siteco Doc Chat")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

class Entry(BaseModel):
    question: str
    models: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


# TODO (Step 4/5):
# POST /upload  -> ingest.ingest_pdf(...)
# POST /chat    -> retrieval.answer(...) as StreamingResponse (SSE)


@app.post("/upload")
def upload(file: UploadFile):
    bytes = file.file.read()
    filename = file.filename.removesuffix(".pdf")
    return ingest_pdf(bytes, filename)



@app.post("/chat")
def chat(question : str,model=''):
    print(model)
    return StreamingResponse(answer(question,model), media_type="text/plain")

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
    # Auswahl für die Dropdowns im Frontend, konfigurierbar über COMPARE_MODELS in .env

    return list_documents()


@app.get("/sources")
def sources():
    return src





