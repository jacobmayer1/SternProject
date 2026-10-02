"""Thin wrapper around Chroma. Only this file knows which vector store we use."""
import os
from typing import List

import chromadb

CHROMA_PATH = os.getenv("CHROMA_PATH", "chroma_data")

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


def count() -> int:
    return _col.count()
