"""Thin wrapper around Chroma. Only this file knows which vector store we use."""
import os
from typing import List

import chromadb

from fastapi.responses import FileResponse

CHROMA_PATH = os.getenv("CHROMA_PATH", "chroma_data")
PDF_DIR = os.path.join(CHROMA_PATH, "pdfs")



_client = chromadb.PersistentClient(path=CHROMA_PATH)
_col = _client.get_or_create_collection(
    name="docs",
    metadata={"hnsw:space": "cosine"},
)


def upsert(ids: List[str], vectors: List[List[float]], texts: List[str], metadatas: List[dict]) -> None:
    # We always pass our own embeddings -> Chroma never embeds on its own.
    _col.upsert(ids=ids, embeddings=vectors, documents=texts, metadatas=metadatas)

def search(vector: List[float], k: int = 5) -> List[dict]:
    r = _col.query(query_embeddings=[vector], n_results=k)
    return [
        {"text": t, "meta": m, "score": 1 - d}  # Chroma returns distance, we want similarity
        for t, m, d in zip(r["documents"][0], r["metadatas"][0], r["distances"][0])
    ]

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

def save_pdf(filename:str, pdf_bytes):

    path_withend=  filename +".pdf"

    os.makedirs(PDF_DIR, exist_ok=True)

    pdf_path = os.path.join(PDF_DIR, path_withend)

    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

def get_pdf(filename:str):

    path_withend=  filename +".pdf"

    pdf_path = os.path.join(PDF_DIR, path_withend)

    if not os.path.exists(pdf_path):
        return None

    return FileResponse(pdf_path, media_type="application/pdf")

def count() -> int:
    return _col.count()

