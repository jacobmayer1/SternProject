"""Provider interface. The rest of the app only knows embed() and chat_stream().
Swapping OpenAI for another provider means changing only this file."""
import os
from typing import Iterator, List

from openai import OpenAI

EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

_client = None


def _get_client() -> OpenAI:
    # lazy, so importing this module doesn't fail without a key
    global _client
    if _client is None:
        _client = OpenAI()  # reads OPENAI_API_KEY
    return _client


def embed(texts: List[str]) -> List[List[float]]:
    """Embeddet eine Liste von Texten, ein Vektor pro Text."""
    resp = _get_client().embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]


def chat_stream(messages: List[dict],model = CHAT_MODEL) -> Iterator[str]:
    """Streamt die Antwort des Chat-Modells Token für Token."""
    stream = _get_client().chat.completions.create(
        model=model, messages=messages, stream=True
    )
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
