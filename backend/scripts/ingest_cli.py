"""Quick check for Step 4:  cd backend && python -m scripts.ingest_cli ../sample_docs/test.pdf"""
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app import ingest, store  # noqa: E402

path = Path(sys.argv[1])
n = ingest.ingest_pdf(path.read_bytes(), doc_id=path.stem)
print(f"Ingested {n} chunks. Store now holds {store.count()} chunks.")
