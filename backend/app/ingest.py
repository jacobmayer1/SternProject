"""Ingest pipeline: PDF -> pages -> chunks -> embeddings -> store.

YOUR CODE (Step 4). Keep it explicit - this is what gets discussed in the call.
"""

import fitz
from typing import List
import re
from app import llm, store


CHUNK_SIZE = 3000     # chars, ~800 tokens  (justify in DECISIONS.md)
CHUNK_OVERLAP = 400   # chars, ~100 tokens


def extract_pages(pdf_bytes: bytes) -> List[dict]:
    """Return [{"page": 1, "text": "..."}, ...] using PyMuPDF (import fitz)."""

    doc=  fitz.open(stream=pdf_bytes, filetype="pdf")

    retList = []

    counter = 1
    for page in doc:



        page_entry = {"page":counter,"text":page.get_text()}

        counter += 1
        if page_entry["text"].strip():
            retList.append(page_entry)


    ##print(retList)

    return retList




SEPARATORS = ["\n\n", "\n", ". ", " "]  # grob -> fein


def _overlap_tail(text: str) -> str:
    """Last CHUNK_OVERLAP chars, starting at a word boundary."""
    tail = text[-CHUNK_OVERLAP:]
    space = tail.find(" ")
    return tail[space + 1:] if space != -1 else tail


def split_text(text: str, separators: List[str] = SEPARATORS) -> List[str]:
    """Recursive split: paragraphs -> lines -> sentences -> words -> hard cut, with overlap."""
    # Fall 1: passt schon
    if len(text) <= CHUNK_SIZE:
        return [text] if text.strip() else []

    # Fall 2: keine Separatoren mehr -> harter Schnitt mit Overlap
    if not separators:
        step = CHUNK_SIZE - CHUNK_OVERLAP
        return [text[i:i + CHUNK_SIZE] for i in range(0, len(text), step)]

    sep, finer = separators[0], separators[1:]
    if sep not in text:
        return split_text(text, finer)

    # Fall 3: zerlegen und wieder zusammenkleben
    chunks: List[str] = []
    current = ""
    for piece in text.split(sep):
        if len(piece) > CHUNK_SIZE:
            # Stück allein zu groß -> aktuellen Chunk abschließen, Stück feiner splitten
            if current.strip():
                chunks.append(current)
            current = ""
            chunks.extend(split_text(piece, finer))
            continue

        candidate = current + sep + piece if current else piece
        if len(candidate) <= CHUNK_SIZE:
            current = candidate
        else:
            chunks.append(current)
            with_overlap = _overlap_tail(current) + sep + piece
            current = with_overlap if len(with_overlap) <= CHUNK_SIZE else piece

    if current.strip():
        chunks.append(current)
    return chunks


def ingest_pdf(pdf_bytes: bytes, doc_id: str) -> int:
    """Full pipeline. Stable ids: f"{doc_id}-{page}-{idx}". Returns #chunks."""

    retList = extract_pages(pdf_bytes)

    chunk_ids = []
    metadatas = []
    vectors = []
    allChunks = []

    for page in retList:

        retList = split_text(page["text"])
        pageNum = page["page"]
        chunkCounter = 0

        for chunk in retList:

            chunk_id = doc_id +"-" + str(pageNum)+"-"+ str(chunkCounter)

            chunk_ids.append(chunk_id)
            allChunks.append(chunk)

            metadata = {"doc_id": doc_id, "page": pageNum, "chunk_idx": chunkCounter}
            metadatas.append(metadata)

            chunkCounter += 1


        for start in range(0, len(retList), 100):
            batch = retList[start:start + 100]
            vectors.extend(llm.embed(batch))


    if not allChunks:
        return 0

    store.upsert(chunk_ids, vectors, allChunks,metadatas)

    return len(allChunks)







