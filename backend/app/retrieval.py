"""Retrieval core: question -> embed -> top-k -> prompt -> streamed answer.

YOUR CODE (Step 5). No framework - this is the part you defend in the Q&A.
"""

from app import llm, store
TOP_K = 5

SYSTEM_PROMPT = (
    "Answer ONLY using the provided context. Cite sources as [p. X]. "
    "If the context does not contain the answer, say so."
)


## TOP_K = 5 warum zu klein bester Chunk ist nicht dabei zu groß zu viel rauschen zu viel unnötiges Koszten zu hoch


def retrieve(question: str, k: int = TOP_K):
    vector = llm.embed([question])[0]
    chunks =  store.search(vector,k)

    return chunks



def build_messages(question: str, chunks) -> list:
    blocks = []
    for chunk in chunks:
        page = chunk["meta"]["page"]
        blocks.append(f"[p. {page}]\n{chunk['text']}")

    context = "\n\n---\n\n".join(blocks)
    user_content = f"Context:\n\n{context}\n\nQuestion: {question}"

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


