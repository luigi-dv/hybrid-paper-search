-- 001_init.sql — first schema for hps (Hybrid Paper Search)

-- Decisions:
--    Which columns are NOT NULL? Should `embedding` be one of them?
--    - Answer: Embedding will be filled in batches via API
--    Should (document, position) be unique?
--    - Answer: Chunk cannot exist without a document and every chunk has a position in the document
--    What happens if the file fails halfway? Can you make it all-or-nothing?
--    - Answer: Half injected documents in our database is not something practical (some chunks saved, rest missing)
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Table `documents`, one row per paper:
--    - an id (primary key)
--    - the arXiv id: required, and no two rows may share it
--    - title (required)
--    - authors (a paper has several: choose a column type for that)
--    - published date

CREATE TABLE documents(
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    arxiv_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    -- Author names in paper order, exactly as arXiv returns them
    authors TEXT[] NOT NULL DEFAULT '{}',
    published_date DATE NOT NULL
);

--
-- 2. Table `chunks`, one row per piece of searchable text:
--    - an id (primary key)
--    - the document it belongs to: a foreign key, and deleting a document
--      must also delete its chunks
--    - position of the chunk inside the document
--    - content (required)
--    - a GENERATED, STORED tsvector column built from `content`
--      with the 'english' configuration
--    - an `embedding` column of type vector(384)
--
CREATE TABLE chunks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    position INT NOT NULL,
    content TEXT NOT NULL,
    tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    embedding vector(384),

    -- Enforce a document cannot have multiple chunks in the same position
    CONSTRAINT chunks_document_position_unique UNIQUE (document_id, position)
);

-- 3. A GIN index on the tsvector column.
CREATE INDEX chunks_tsv_idx ON chunks USING GIN (tsv);

-- 4. An HNSW index on `embedding` using cosine distance.
CREATE INDEX chunks_embedding_idx ON chunks USING HNSW (embedding vector_cosine_ops);
-- Uses the vector_cosine_ops operator class to organize how close are chunks to each other

COMMIT;