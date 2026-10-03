"""Retrieval core: question -> embed -> top-k -> prompt -> streamed answer.

YOUR CODE (Step 5). No framework - this is the part you defend in the Q&A.
"""

from app import llm, store
TOP_K = 5

SYSTEM_PROMPT = (
    "Answer ONLY using the provided context. "
    "Each context block starts with its source label in the form [<document>, p. <page>]. "
    "Cite every fact with exactly that label, e.g. [datasheet, p. 4]. "
    "If the context does not contain the answer, say so."
)

src = []


## TOP_K = 5 warum zu klein bester Chunk ist nicht dabei zu groß zu viel rauschen zu viel unnötiges Koszten zu hoch


def retrieve(question: str, k: int = TOP_K):
    vector = llm.embed([question])[0]
    chunks =  store.search(vector,k)

    return chunks



def build_messages(question: str, chunks) -> list:
    blocks = []
    sources = []
    for chunk in chunks:
        page = chunk["meta"]["page"]
        doc = chunk["meta"]["doc_id"]
        blocks.append(f"[{doc}, p. {page}]\n{chunk['text']}")
        sources.append({
            "doc": chunk["meta"]["doc_id"],
            "page": chunk["meta"]["page"],
            "score": round(chunk["score"], 2),
            "text": chunk["text"][:300],
        })

    context = "\n\n---\n\n".join(blocks)

    user_content = f"Context:\n\n{context}\n\nQuestion: {question}"


    # Liste in-place aktualisieren (nicht neu zuweisen), damit main.py dasselbe Objekt sieht
    src.clear()
    src.extend(sources)






    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def answer(question: str):
    """Generator yielding answer tokens (+ sources at the end)."""

    chunk_answer = retrieve(question, k=TOP_K)
    messages = build_messages(question, chunk_answer)



    for message in llm.chat_stream(messages):
        yield message


