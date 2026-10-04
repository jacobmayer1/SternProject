"""Thin wrapper around Chroma. Only this file knows which vector store we use."""
import os
from typing import List

import chromadb
import fitz

CHROMA_PATH = os.getenv("CHROMA_PATH", "chroma_data")
PDF_DIR = os.path.join(CHROMA_PATH, "pdfs")

_client = chromadb.PersistentClient(path=CHROMA_PATH)
_col = _client.get_or_create_collection(
    name="docs",
    metadata={"hnsw:space": "cosine"},
)


## vektoren in die Datenbank eintragen

def upsert(ids: List[str], vectors: List[List[float]], texts: List[str], metadatas: List[dict]) -> None:
    # We always pass our own embeddings -> Chroma never embeds on its own.
    _col.upsert(ids=ids, embeddings=vectors, documents=texts, metadatas=metadatas)

## suchen nach den nächsten 5 vektoren

def search(vector: List[float], k: int = 5) -> List[dict]:
    r = _col.query(query_embeddings=[vector], n_results=k)
    return [
        {"text": t, "meta": m, "score": 1 - d}  # Chroma returns distance, we want similarity
        for t, m, d in zip(r["documents"][0], r["metadatas"][0], r["distances"][0])
    ]


## gibt alle Dokumente inklusive aller chunks zurück
def list_documents():
    docs = _col.get(include=["metadatas"])

    doc_ids = [m["doc_id"] for m in docs["metadatas"]]

    doc_dic = {}

    for doc_id in doc_ids:

        if doc_id not in doc_dic:
            doc_dic[doc_id] = 1
        else:
            doc_dic[doc_id] += 1

    return doc_dic


def _pdf_path(filename: str) -> str:
    # basename verhindert Path Traversal (z. B. "../../.env") über den Dateinamen aus der URL
    return os.path.join(PDF_DIR, os.path.basename(filename) + ".pdf")


def save_pdf(filename: str, pdf_bytes: bytes) -> None:
    """Speichert das Original-PDF neben der Chroma-Datenbank."""
    os.makedirs(PDF_DIR, exist_ok=True)
    with open(_pdf_path(filename), "wb") as f:
        f.write(pdf_bytes)


def get_pdf(filename: str) -> str | None:
    """Pfad zum gespeicherten PDF oder None, wenn es nicht existiert."""
    pdf_path = _pdf_path(filename)
    return pdf_path if os.path.exists(pdf_path) else None


def render_pdf(filename: str, page: int, citations: list[str]) -> bytes | None:
    """Rendert eine Seite als PNG und markiert alle Fundstellen der Begriffe gelb."""
    pdf_path = get_pdf(filename)
    if pdf_path is None:
        return None

    doc = fitz.open(pdf_path)
    if page < 1 or page > len(doc):
        doc.close()
        return None

    ret_page = doc[page - 1]  # PyMuPDF zählt Seiten ab 0
    for citation in citations:
        for rect in ret_page.search_for(citation):  # alle Fundstellen als Rechtecke
            ret_page.add_highlight_annot(rect)  # gelber Textmarker

    png = ret_page.get_pixmap(dpi=110).tobytes("png")
    doc.close()
    return png


def count() -> int:
    """Anzahl aller Chunks im Store."""
    return _col.count()
