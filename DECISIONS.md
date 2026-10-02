# Decisions

Format: **X instead of Y, because Z.**

- **OpenAI (embeddings + chat) instead of Ollama / Claude+OpenAI:** one key, lowest setup risk for "runs on your machine". Provider is isolated behind `llm.py` (`embed()`, `chat_stream()`), so swapping is one file.
- **Chroma in-process instead of Qdrant:** one service less, less setup risk. Production-readiness is explicitly not graded. In production I'd run Qdrant/pgvector as a separate service; only `store.py` changes.
- **Own embeddings passed to Chroma instead of Chroma's built-in embedder:** keeps the retrieval core explicit and in my code.
- **Self-written retrieval loop instead of LangChain/LlamaIndex:** ~50 lines, fully explainable, no hidden behaviour.
- **Chunking by characters (~3000 / 400 overlap) instead of tokens:** avoids tiktoken; ~4 chars/token is close enough for this scope.
