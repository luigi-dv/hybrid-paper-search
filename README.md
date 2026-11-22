# hps — Hybrid Paper Search

A search service for research papers. It loads arXiv abstracts into PostgreSQL and
searches them in two ways: by keywords (full-text search) and by meaning (vector
search). The next goal is to merge both results into one ranking.

I am building this project to learn, and to show how I build a TypeScript backend
on PostgreSQL with a small Python service for the machine learning part.

I keep a [learning log](docs/LEARNING_LOG.md) of every step: what I built, the
decisions I took and why, what surprised me, and which parts I wrote myself and
which parts an AI assistant wrote.

## Status

| Part                                        | State        |
|---------------------------------------------|--------------|
| PostgreSQL with pgvector in Docker          | Done         |
| Schema with full-text and vector indexes    | Done         |
| Embedding service (Python, FastAPI)         | Done         |
| Loader: arXiv → embeddings → PostgreSQL     | Done         |
| Search queries written and checked by hand  | Done         |
| API with `/search/keyword` and `/search/vector` (Fastify) | Done    |
| Hybrid search (Reciprocal Rank Fusion) and reranking      | Planned |

## How it works

```
                 ┌────────────┐
   arXiv API ───▶│   Loader   │──── texts ───▶ ┌──────────────┐
                 │ (Node, TS) │◀── vectors ─── │  ML service  │
                 └─────┬──────┘                │ (Python)     │
                       │ documents + chunks    └──────────────┘
                       ▼
                 ┌────────────────────────┐
                 │ PostgreSQL + pgvector  │
                 │  tsvector  → GIN index │
                 │  vector    → HNSW index│
                 └────────────────────────┘
```

1. The loader gets about 300 recent papers from arXiv (categories `cs.IR` and `cs.CL`).
2. It sends the text of each paper to the ML service, in batches of 32, and gets one vector per paper.
3. It saves each paper as a document and a chunk, in one transaction per batch.
4. PostgreSQL keeps two views of the same text: the words (for keyword search) and the vector (for search by meaning).

## Stack

- **Database:** PostgreSQL 17 with pgvector, in Docker
- **Loader and API:** Node.js, TypeScript, `pg`, `tsx`
- **ML service:** Python 3.12, FastAPI, sentence-transformers, model `BAAI/bge-small-en-v1.5` (384 dimensions)

## Run it with Docker

Requirements: Docker only.

```bash
cp .env.example .env                 # then set POSTGRES_PASSWORD
docker compose up -d --build         # database, ML service and API
docker compose run --rm loader       # loads about 300 papers
curl -s 'localhost:3000/search/vector?q=how%20to%20evaluate%20search%20quality'
```

The first build takes a few minutes, and the first start downloads the model
(about 130 MB). A new database applies `migrations/` by itself.

## Run it for development

Requirements: Docker, Node.js 22 or newer, Python 3.12. Here only the database
runs in Docker, so do not start the `ml` and `api` containers at the same time:
they use the same ports.

**1. Database**

```bash
cp .env.example .env        # then set POSTGRES_PASSWORD
docker compose up -d db
docker compose exec -T db psql -U app -d hps -v ON_ERROR_STOP=1 < migrations/001_init.sql
```

Set the password before the first start. PostgreSQL only reads it when the data
volume is created.

**2. ML service** (in a second terminal)

```bash
cd ml
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001
```

The first start downloads the model (about 130 MB). More details in [ml/README.md](ml/README.md).

**3. Load the papers**

```bash
npm install
npm run load
```

The last line says how many papers are new. The script can be run again at any
time: papers that are already loaded are skipped.

**4. Check the data**

```bash
docker compose exec db psql -U app -d hps -c "SELECT count(*) FROM documents;"
```

**5. Start the API**

```bash
npm run dev
curl -s 'localhost:3000/search/keyword?q=retrieval%20augmented%20generation'
curl -s 'localhost:3000/search/vector?q=how%20to%20evaluate%20search%20quality'
```

Both routes take `q` (required) and `limit` (1 to 50, default 10), and return
`{ "results": [{ "arxivId", "title", "score" }] }`. If the ML service is down,
the vector route answers 503 and the keyword route keeps working.

## Project structure

```
docker-compose.yml       database, ML service, API and loader
Dockerfile               image for the API and the loader
migrations/              SQL schema
queries/                 search queries written by hand
src/                     loader and API
  load.ts                loader entry script
  server.ts              API entry point
  app.ts                 builds the Fastify app (no side effects, so it can be tested)
  plugins/               the database pool as a Fastify plugin
  routes/                the search routes and their JSON schemas
  constants/             configuration values, shared objects, SQL statements
  helpers/               small pure functions
  services/              one folder per external system
    papers/              arXiv
    embedding/           the ML service
    database/            the PostgreSQL pool
  types/
ml/                      embedding service (Python, FastAPI), with its own Dockerfile
```

## Design decisions

**Two tables: `documents` and `chunks`.** Today one abstract is one chunk. The
tables are separated because a full PDF will later be split into many chunks,
and the schema does not need to change for that.

**The `tsvector` is a generated, stored column.** `to_tsvector` is expensive.
Generating it once per insert saves resources, instead of computing it for every
row in every search. A stored column can also have an index.

**GIN index for keyword search.** A B-tree index cannot find a word buried inside
a paragraph. GIN is an inverted index: it maps each word to the rows that contain it.

**HNSW index with cosine distance for vector search.** HNSW can be created on an
empty table and handles new rows as they arrive. Cosine distance compares the
angle between two vectors and ignores their length, which is how this model is
meant to be used.

**The query prefix is added in the ML service.** The model expects a fixed
sentence in front of search queries. The service adds it, so every client gets
the same behaviour and none of them needs to know the model's rule.

**One transaction per batch in the loader.** A paper is two rows. Both are saved
or neither is, so there is never a document that no search can find.

**The loader can be run again safely.** `ON CONFLICT (arxiv_id) DO NOTHING`
skips papers that are already loaded, so after a crash the script continues
where it stopped.

**Embeddings are requested before the transaction starts.** The HTTP call is
slow, and an open transaction should not hold a database connection while it waits.

## Roadmap

- Hybrid search: merge both rankings with Reciprocal Rank Fusion
- A cross-encoder to rerank the top results
- Background jobs with pg-boss, to load and embed papers outside the request
