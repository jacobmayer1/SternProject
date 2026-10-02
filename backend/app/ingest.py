"""Ingest pipeline: PDF -> pages -> chunks -> embeddings -> store.

YOUR CODE (Step 4). Keep it explicit - this is what gets discussed in the call.
"""
from typing import List

CHUNK_SIZE = 3000     # chars, ~800 tokens  (justify in DECISIONS.md)
CHUNK_OVERLAP = 400   # chars, ~100 tokens


def extract_pages(pdf_bytes: bytes) -> List[dict]:
    """Return [{"page": 1, "text": "..."}, ...] using PyMuPDF (import fitz)."""
    raise NotImplementedError


def split_text(text: str) -> List[str]:
    """Recursive split: paragraphs -> sentences -> hard cut, with overlap."""
    raise NotImplementedError


def ingest_pdf(pdf_bytes: bytes, doc_id: str) -> int:
    """Full pipeline. Stable ids: f"{doc_id}-{page}-{idx}". Returns #chunks."""
    raise NotImplementedError
