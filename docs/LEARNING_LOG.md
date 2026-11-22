## 2026-11-21 · Step 1 — PostgreSQL with pgvector in Docker

**What I built:**
- Named all based on hps (Hybrid Paper Search). .env Password set and container running and ran checkpoint queries

**Why it's built this way (the trade-off):**
- Named volume: To identify easily when i ran manual check on my docker environment due to a lot of local environments I'm running
- Extensions are opt in per db and we need it for our main purpose (Store vector embeddings and run fast and efficient similarity searches)

**Commands / queries I ran:**
```
cp .env.example .env
docker compose up -d db
docker compose exec db psql -U app -d hps
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

**What I learned / what surprised me:**
- N/A

**What Claude wrote vs what I wrote:**
- Claude: .gitignore, AGENTS.md
- Me: docker-compose.yml, set the password, enabled the extension

**Open questions:**
- N/A

**Time spent:** 5 min

---

## 2026-11-21 · Step 2 — Schema and indexes

**What I built:**
- `migrations/001_init.sql`: tables `documents` and `chunks`, a generated tsvector column, a GIN index, an HNSW index with cosine distance, all inside one transaction

**Why it's built this way (the trade-off):**
- Generated stored tsvector: to_tsvector is expensive and generate it once per insert save resources instead of being computed in the query and be running for every row in every search.
- GIN: Because we will not find a word buried inside paragraphs with a B-tree index, and with the tsvector we get the paragraphs lexemes that will help to our search.
- vector(384): Because is the exact output size of many lightweight models in our case: BAAI/bge-small-en-v1.5 outputs 384-dimensional vectors. What breaks if the number is wrong: PostgreSQL rejects the insert and throws and error. (Nothing written or truncated)
- HNSW: Because can handle live inserts without the data be there at first and as we gonna get papers async this is the setup we need
- vector_cosine_ops: Used in many embedding models, this measures the cosine distance (angle between two vectors ignoring the magnitude)
- Unique (document_id, position): Because position can be assigned to X documents but position Y in a document is unique.
- BEGIN / COMMIT: Possibility to rollback
- Authors: started with `authors` + `documents_authors` tables, changed to a `TEXT[]` column because arXiv only gives name strings, no ORCID

**Commands / queries I ran:**
```
docker compose exec -T db psql -U app -d hps -v ON_ERROR_STOP=1 < migrations/001_init.sql
\d chunks
```

**What I learned / what surprised me:**
- N/A

**What Claude wrote vs what I wrote:**
- Claude: N/A this time
- Me: both tables, the generated column, both indexes, the pair constraint, BEGIN/COMMIT

**Open questions:**
- Review `Distance Metrics` Scenarios and performance

**Time spent:** 35 min

---

## 2026-11-21 · Step 3 — Python embedding service

**What I built:**
- `ml/`: FastAPI service with `POST /embed` (384-dimensional normalised vectors from BAAI/bge-small-en-v1.5), `/health/live` and `/health/ready`
- Restructured it into domain (port) / application (service) / infrastructure (model, container) / routers
- Decision: the query prefix is added in the service (option A), with the `is_query` flag

**Why it's built this way (the trade-off):**
- Load the model once at startup: to keep it warm in memory reduces per-request latency. This way we avoid memory exhaust requests when multiple requests reach the server at once
- Normalize the vectors: Because we are comparing semantic and not length. Scores will be consistent and comparable across all vectors.
- Python and not Node:  Basically because the ecosystem. PyTorch, sentence-transformers and Hugging Face are Python first. Newer models are also published with python code
- Service receives the EmbeddingModel port: For testing, compatibility when swapping models. It respects the architecture, the application module does not import infrastructure ones.
- Prefix in the service: every client gets the same behavior and none of them needs to know the model's rule

**Commands / queries I ran:**
```
cd ml && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001
curl -s localhost:8001/embed -H 'content-type: application/json' -d '{"texts":["hello"]}'   # 384
```

**What I learned / what surprised me:**
- N/A

**What Claude wrote vs what I wrote:**
- Claude: The final prefix line in `embedding_service.py` and the `README.md`
- Me: the folder structure and code style (class-proxy routers, config file), one attempt at the prefix code that Claude Code fixed

**Open questions:**
- N/A

**Time spent:** 30 min

---

## 2026-11-22 · Step 4 — Load the abstracts

**What I built:**
- Node + TypeScript project restructured into `constants/`, `helpers/`, `services/`, `types/` with the `@/` alias
- `src/load.ts`: fetch ~300 papers from arXiv, embed in batches of 32, insert document + chunk in one transaction per batch
- The two SQL statements: `INSERT ... ON CONFLICT (arxiv_id) DO NOTHING RETURNING id` and the chunk insert with `$3::vector`

**Why it's built this way (the trade-off):**
- Transaction per batch: A paper is not just one entry is a document + chunks, a transaction guarantee both are saved or neither is.
- Batches of 32: 300 documents are 300 requests, the model is capable enough to compute multiple texts in parallel, 300  will be more memory in the model but in batches of 32 that will be less requests and the model is large enough to compute it fast and small enough to be in the memory constrains.
- ON CONFLICT DO NOTHING: The load script is idempotent. Multiple runs continue loading skipping what was already loaded. 
- to_tsvector('english'): A text or a chain of strings is transformed to a sorted list of normalized lexemes or root words
- embed() before BEGIN: Because the HTTP Call is slow. Waiting for them will hold a connection waiting for the response while the database is doing nothing, in case of a real scenario with many loaders and a slow ML service, pool will run out of connections.
**Commands / queries I ran:**
```
npm run load        # twice: ~300 new, then 0 new
SELECT count(*) FROM documents;
SELECT count(*) FROM chunks WHERE embedding IS NULL;
SELECT title, left(tsv::text, 120) FROM chunks JOIN documents d ON d.id = document_id LIMIT 3;
```

**What I learned / what surprised me:**
- Correct structure loading script for documents per batches based on a Batch Throughput algorithm (Total Items Processed / Total Batched elapsed time)

**What Claude wrote vs what I wrote:**
- Claude: package.json, first tsconfig, pool, arXiv fetch/parse, embed client, the body of `loadBatch` (connect, BEGIN/COMMIT/ROLLBACK, release), `toVectorLiteral`
- Me: the folder pattern and alias, the two SQL statements

**Open questions:**
- N/A

**Time spent:** 40 min

---

## 2026-11-22 · Step 5 — Run the searches by hand

**What I built:**
- `queries/search.sql`: a keyword query (CTE with `websearch_to_tsquery`, `@@`, `ts_rank`, `ts_headline` snippet) and a vector query (nearest neighbours of one chunk with `<=>`)
- Read the plans with `EXPLAIN ANALYZE`, normal and with `enable_seqscan` / `enable_sort` off

**Why it's built this way (the trade-off):**
- websearch_to_tsquery: Because we needed to parser text in this case search-engine style text safely.
- Distance to similarity: Subtracting the distance (1 - (v1 <=> v2))
- Use `c.tsv`, not `to_tsvector(content)` in the query: because `to_tsvector() expects its own syntax operators (retrieval and augmented) and plain user text like with create a syntax error using this function.
- Why Postgres ignored the HNSW index with 300 rows, and when it starts using it: Based on the experiment the reason was computational cost for the 300 rows, read everything and sort it was cheaper at this point. The index costs stay flat but the read and sorting increments with entry numbers.
- Reference vector as a scalar subquery and not a join: the index can just solve one question, Which are the nearest to one given vector?

**Commands / queries I ran:**
```
SET enable_seqscan = off;
SET enable_sort = off;
EXPLAIN ANALYZE <vector query>;
RESET enable_sort;
RESET enable_seqscan;
```
- Vector query: Seq Scan + Sort ≈ 2.8 ms · HNSW index scan ≈ 0.96 ms (estimated cost 98 vs 333)
- Keyword query plans:
  | chunk\_id | document\_id | position | arxiv\_id | title | distance | similarity |
  | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
  | 258 | 258 | 0 | 2611.22079 | SIMQ: A Single Graph-based Index for Multi-Vector Query | 0.14981763661994563 | 0.8501823633800544 |
  | 13 | 13 | 0 | 2611.26358 | Beam Model Technical Report | 0.1856707819896456 | 0.8143292180103544 |
  | 54 | 54 | 0 | 2611.25738 | CACO: Coverage-Aware Coordinated Optimization for Continuous Generative Retrieval | 0.1889734155551529 | 0.8110265844448471 |
  | 294 | 294 | 0 | 2611.21478 | Jetriever: Shifting Agent Memory Retrieval from Similarity to Utility | 0.19993484020233154 | 0.8000651597976685 |
  | 60 | 60 | 0 | 2611.25691 | Exploring Semantic Table Search in Data Lakes | 0.20375506855517078 | 0.7962449314448292 |
  | 163 | 163 | 0 | 2611.23606 | VIBRA: Backward-Compatible Cross-Modal Retrieval with Consensus Barycenters | 0.2061975598335266 | 0.7938024401664734 |
  | 237 | 237 | 0 | 2611.22392 | Deal With It: On Better Schedules for Listwise Reranking | 0.21448794646525193 | 0.7855120535347481 |
  | 197 | 197 | 0 | 2611.23026 | TPHC: Improving Hyper-Connections with Tensor-Parallel Grouped Updates | 0.21918113345987267 | 0.7808188665401273 |
  | 63 | 63 | 0 | 2611.25659 | DNA: Unlocking Depth Scaling in CTR Models | 0.22392046451568604 | 0.776079535484314 |
  | 214 | 214 | 0 | 2611.22766 | StitchRAG: Constructing Compact and Evidence-Preserving Contexts for RAG with Diffusion-Based Stitching | 0.22642192525601723 | 0.7735780747439828 |


**What I learned / what surprised me:**
- PostgreSQL decisions of index usage based on costs 

**What Claude wrote vs what I wrote:**
- Claude: the fixed Version 3 keyword query (`c.tsv`, literal instead of `$1`), the final vector query with the scalar subquery
- Me: the first versions of both queries (CTE + CROSS JOIN, tie-breaker, ts_headline, distance and similarity columns), running and pasting the plans

**Open questions:**
- N/A

**Time spent:** 1h 

---

## Step 6 — Fastify endpoints

**What was built:**
- `GET /search/keyword` and `GET /search/vector`, both with `q` (required) and `limit` (1–50, default 10)
- Both return `{ results: [{ arxivId, title, score }] }`

**Decisions I made:**
- ML service down or slow → 503 with a 5 second timeout on the embed call. Keyword search keeps working.
- A response schema on both routes.
- No snippet in the results: both routes return the same shape.
- I noticed that `start()` ran on import in `server.ts`, so the app factory moved to `app.ts`.

**Checkpoint (requests sent with `app.inject()`):**
- keyword "retrieval augmented generation" → 200, RAG papers first
- vector "how to evaluate search quality" → 200, related papers with no shared words
- `q=` → 400, `limit=500` → 400, a word that matches nothing → 200 with `[]`
- Not tested: the 503 path (the ML service was running)

**Time spent:** 20 min