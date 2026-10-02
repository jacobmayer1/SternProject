"""Retrieval core: question -> embed -> top-k -> prompt -> streamed answer.

YOUR CODE (Step 5). No framework - this is the part you defend in the Q&A.
"""
TOP_K = 5

SYSTEM_PROMPT = (
    "Answer ONLY using the provided context. Cite sources as [p. X]. "
    "If the context does not contain the answer, say so."
)


def retrieve(question: str, k: int = TOP_K):
    raise NotImplementedError


def build_messages(question: str, chunks) -> list:
    raise NotImplementedError


def answer(question: str):
    """Generator yielding answer tokens (+ sources at the end)."""
    raise NotImplementedError
