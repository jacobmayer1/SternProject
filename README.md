# Siteco Doc Chat

Chat with your PDFs. Upload a document, ask a question and get an answer that is grounded in the document: every fact is cited with document and page, and the cited page can be opened in the original PDF with the relevant values highlighted.

The retrieval loop (chunking → embedding → top-k search → prompt) is hand-written, without LangChain or similar frameworks.

## Run

```bash
cp .env.example .env          # add your OPENAI_API_KEY
docker compose up --build
```

Frontend: http://localhost:5173 · Backend: http://localhost:8000 · API docs: http://localhost:8000/docs

| Variable         | Default                                   | Purpose                        |
|------------------|-------------------------------------------|--------------------------------|
| `OPENAI_API_KEY` | – (required)                              | Embeddings + chat              |
| `EMBED_MODEL`    | `text-embedding-3-small`                  | Embedding model                |
| `CHAT_MODEL`     | `gpt-4o-mini`                             | Default answer model           |
| `COMPARE_MODELS` | `gpt-4o-mini,gpt-4o,gpt-4.1-mini,gpt-4.1` | Models in the picker / comparison |

Without Docker: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`, and `cd frontend && npm install && npm run dev`.

## Features

- **Grounded answers** with citations `[document, p. X]`; if the context doesn't contain the answer, the model says so.
- **Cited sources** below each answer with page, relevance score and snippet.
- **Citation highlighting:** open the original PDF at the cited page, or view the page rendered with the cited values highlighted.
- **Markdown rendering** (lists, tables).
- **Multi-model:** choose the answer model or compare two models side by side with response time (same retrieved context for both).
- **Retrieval evaluation** with Hit@k and MRR.
- **Document list** of all uploaded PDFs.

## Architecture

```
Upload   → PyMuPDF (per page) → recursive chunking (3000 chars / 400 overlap) → OpenAI embeddings → Chroma
Question → embed → top-k (k=5) → prompt with [doc, p. X] labels → LLM → streamed answer + sources
```

| File | Responsibility |
|------|----------------|
| `backend/app/main.py` | FastAPI endpoints only |
| `backend/app/ingest.py` | PDF → chunks → embeddings → store |
| `backend/app/retrieval.py` | retrieval core, prompt, answer, model comparison |
| `backend/app/llm.py` | provider interface (`embed`, `chat_stream`) – only file that knows OpenAI |
| `backend/app/store.py` | only file that knows Chroma; stores and renders the original PDFs |
| `frontend/src/App.tsx` | chat, upload, model selection/comparison, document list |
| `frontend/src/Sources.tsx` | cited sources + PDF / highlighted-page overlay |

## Retrieval evaluation

15 hand-written questions on `SITECO_Lichtbandsysteme_DE.pdf`, each with the page(s) containing the answer (`eval/questions.json`), phrased in my own words rather than the PDF's wording.

| Metric | k = 1 | k = 3 | k = 5 | k = 10 |
|--------|-------|-------|-------|--------|
| Hit@k  | 0.53  | 1.00  | 1.00  | 1.00   |
| MRR    | 0.74  |       |       |        |

The answer page is always within the top 5 chunks the LLM receives (Hit@k saturates at k = 3); ranking is the weak spot (Hit@1 = 0.53). With only ~30 chunks in the document, Hit@1 and MRR are the more meaningful numbers.

```bash
cd backend
python -m scripts.ingest_cli ../sample_docs/SITECO_Lichtbandsysteme_DE.pdf   # index locally
python -m scripts.eval
```
