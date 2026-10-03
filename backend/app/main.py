"""HTTP layer: thin FastAPI endpoints. Logic lives in ingest.py / retrieval.py."""


from dotenv import load_dotenv
from starlette.responses import StreamingResponse

from app.ingest import ingest_pdf
from fastapi.middleware.cors import CORSMiddleware

from app.retrieval import retrieve, answer,src

load_dotenv()  # local dev: reads ../.env or .env; in Docker env_file is used

from fastapi import FastAPI, UploadFile  # noqa: E402

app = FastAPI(title="Siteco Doc Chat")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

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
def chat(question : str):
    return StreamingResponse(answer(question), media_type="text/plain")


@app.get("/sources")
def sources():
    return src





