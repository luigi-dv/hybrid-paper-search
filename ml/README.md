# ML service — hps (Hybrid Paper Search)

A small FastAPI service that turns text into embeddings. The Node API and the
loader call it; it has no database and keeps no state besides the model in memory.

- Model: `BAAI/bge-small-en-v1.5` (384 dimensions)
- Output: normalised vectors (length 1), so cosine similarity equals the dot product

## Run it

Requires Python 3.12.

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001
```

Run `uvicorn` from inside `ml/`: the imports start at `src`, which Python finds
relative to the current folder.

The first start downloads the model (about 130 MB) into the Hugging Face cache.
The service is ready when the log shows `Application startup complete`.

Interactive API docs: http://localhost:8001/docs

## Endpoints

| Method | Path            | Purpose                                              |
|--------|-----------------|------------------------------------------------------|
| POST   | `/embed`        | Embed a list of texts                                |
| GET    | `/health/live`  | The process is up                                    |
| GET    | `/health/ready` | The model is loaded; returns its name                |
| GET    | `/`             | Simple alive message                                 |

### POST /embed

Request:

```json
{ "texts": ["hybrid search with pgvector"], "is_query": false }
```

| Field      | Type     | Rules                                   |
|------------|----------|-----------------------------------------|
| `texts`    | string[] | required, 1 to 128 items                |
| `is_query` | boolean  | optional, default `false`               |

Response: one vector per text, in the same order.

```json
{ "embeddings": [[-0.0338, -0.0217, "... 384 numbers"]] }
```

An invalid body (for example an empty `texts` list) returns `422`.

### When to set `is_query`

bge v1.5 expects a fixed sentence in front of search queries, and nothing in
front of the passages being searched. The service adds it, so clients only say
what the text is for:

- Storing a paper's text: `is_query: false` (the default)
- Embedding what a user typed in the search box: `is_query: true`

The same text gives a different vector in each mode.

### Quick check

```bash
curl -s localhost:8001/embed -H 'content-type: application/json' \
  -d '{"texts":["hello"]}' \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)['embeddings'][0]))"
# 384
```

## Configuration

All settings are optional. To override one, copy `.env.example` to `.env`.

| Variable               | Default                  | Meaning                         |
|------------------------|--------------------------|---------------------------------|
| `LOG_LEVEL`            | `INFO`                   | Python logging level            |
| `EMBEDDING_MODEL_NAME` | `BAAI/bge-small-en-v1.5` | Model loaded at startup         |

Changing the model also changes the vector size. The database column is
`vector(384)`, so a model with another size needs a migration and re-embedding.

## Structure

```
ml/
  main.py                      app factory; lifespan builds the container
  src/
    service_config.py          settings from environment / .env
    module/
      domain/ports/            EmbeddingModel: the interface the app depends on
      application/services/    EmbeddingService: the use case, adds the query prefix
      infrastructure/          SentenceTransformerModel (the real model), Container (wiring)
    routers/
      routes.py                mounts all routers
      dependencies.py          gives routes access to the container
      embed/                   POST /embed and its request/response schemas
      health/                  liveness and readiness
```

Dependencies point inwards: routers → application → domain. The infrastructure
layer implements the domain port, and only `container.py` names the concrete
model class. That is why the service can be tested with a fake model, without
PyTorch.
