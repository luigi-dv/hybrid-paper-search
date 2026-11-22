# AGENTS.md — hybrid-paper-search

## Project
Hybrid search over research papers (arXiv abstracts): PostgreSQL full-text search and pgvector
similarity search, merged with Reciprocal Rank Fusion (RRF) and reranked with a cross-encoder.
Search quality is measured with an evaluation set (recall@10, MRR).

## Stack
- API: Node.js, TypeScript, Fastify v5, `pg`
- Database: PostgreSQL 17 with pgvector (Docker image `pgvector/pgvector:pg17`)
- ML service: Python, FastAPI, sentence-transformers, [`BAAI/bge-small-en-v1.5`](https://huggingface.co/BAAI/bge-small-en-v1.5) (384 dimensions) 
- Background jobs: pg-boss
- Reranking: cross-encoder (`BAAI/bge-reranker-base`)

## Working rules for AI agents
The goal is code the author fully owns: the author researches, decides and drive the workflow. Agents assist; the author is accountable.

**Boilerplate: the agent writes it.** Configuration and plumbing: package.json, tsconfig,
docker-compose.yml, Dockerfiles, the Fastify bootstrap, the database pool, XML parsing, the Python
service skeleton. After writing, list each file with one line on what it does.

**Core logic: the author writes it, the agent reviews.** This covers:
- the SQL schema, indexes and migrations
- the search queries (keyword, vector, fusion)
- insert logic and transactions
- Fastify route handlers and their JSON schemas
- the evaluation metrics

For these, the agent explains the concept and its trade-off in at most 5 bullets, leaves a
`TODO(human)` describing what the code must do, and stops. On review, it points to problems with
hints first and gives a full fix only when asked.

**Database access.** The agent provides SQL and psql commands with what to look for in the output.
It does not run queries against the database or delete data or volumes unless asked.

**Scope.** One task at a time, small diffs, stop at each checkpoint and wait for review.

**Design decisions.** Before moving on from a step, the agent asks the author to explain the key
decision and flags gaps. Agreed decisions go into `docs/DESIGN.md`: the decision, the alternatives
considered and the trade-off, in the author's words.

## Commands
- Start everything in Docker: `docker compose up -d --build`, then `docker compose run --rm loader`
- Start only the database: `docker compose up -d db`
- Open psql: `docker compose exec db psql -U app -d hps`
- ML service: `cd ml && uvicorn main:app --port 8001`
- API (dev): `npm run dev`
- Load data: `npm run load`
 