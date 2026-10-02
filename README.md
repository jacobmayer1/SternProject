# Siteco Doc Chat

Chat with a PDF. Answers are grounded in retrieved chunks and cite their source page.

## Run
```bash
cp .env.example .env   # add your OPENAI_API_KEY
docker compose up --build
curl localhost:8000/health
```

## Environment variables
| Var | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | yes | - |
| `EMBED_MODEL` | no | `text-embedding-3-small` |
| `CHAT_MODEL` | no | `gpt-4o-mini` |

## What / why
See [DECISIONS.md](DECISIONS.md).

## Next steps
TODO
