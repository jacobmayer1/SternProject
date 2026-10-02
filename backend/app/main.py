"""HTTP layer: thin FastAPI endpoints. Logic lives in ingest.py / retrieval.py."""
from dotenv import load_dotenv

load_dotenv()  # local dev: reads ../.env or .env; in Docker env_file is used

from fastapi import FastAPI  # noqa: E402

app = FastAPI(title="Siteco Doc Chat")


@app.get("/health")
def health():
    return {"status": "ok"}


# TODO (Step 4/5):
# POST /upload  -> ingest.ingest_pdf(...)
# POST /chat    -> retrieval.answer(...) as StreamingResponse (SSE)
