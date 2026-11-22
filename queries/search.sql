-- Step 5: the two search queries, written by hand before they go into the API.
-- Run the whole file with:
--   docker compose exec -T db psql -U app -d hps < queries/search.sql

-- 1. Keyword search
-- General Definition before (tsvector and @@)
    SELECT
        d.id,
        d.arxiv_id,
        d.title
    FROM chunks AS c
             INNER JOIN documents AS d
                       ON d.id = c.document_id
    WHERE c.content IN ('retrieve', 'augment', 'generate')
    ORDER BY c.document_id, c.position;

    -- Version 2
    WITH query AS (
        SELECT websearch_to_tsquery('english', 'retrieval augmented generation') AS tsq
    )
    SELECT
        d.id AS document_id,
        d.arxiv_id,
        d.title,
        -- Highest chunk relevance score for this document
        MAX(ts_rank(to_tsvector('english', c.content), q.tsq)) AS rank,
        COUNT(*) AS matching_chunks
    FROM chunks AS c
            -- Only include chunks linked to a valid parent document
             INNER JOIN documents AS d
                        ON d.id = c.document_id
             CROSS JOIN query AS q
    -- Keep only chunks whose text matches the search query
    WHERE to_tsvector('english', c.content) @@ q.tsq
    -- Group by document so each paper appears at most once (q.tsq is constant across all rows)
    GROUP BY d.id, d.arxiv_id, d.title, q.tsq
    -- Order by highest relevance first; break ties deterministically by document ID
    ORDER BY rank DESC, d.id ASC
        LIMIT 10;

    --Version 3
    -- Parse the raw search text ($1) into a normalized English tsquery once
    WITH query AS (
        SELECT websearch_to_tsquery('english', $1) AS tsq
    )
    -- Rank matching chunks per document and return the top 10 papers
    SELECT
        c.id AS chunk_id,
        c.document_id,
        -- For now c.position will be 0 as we just have one chunk per document
        c.position,
        d.arxiv_id,
        d.title,
        -- fixed
        ts_rank(c.tsv, q.tsq) AS rank,
        ts_headline('english', c.content, q.tsq, 'MaxWords=35, MinWords=15') AS snippet
    FROM chunks AS c
             -- Only include chunks linked to a valid parent document
             INNER JOIN documents AS d
                        ON d.id = c.document_id
             CROSS JOIN query AS q
    -- Keep only chunks whose text matches the search query (Fixed)
    WHERE c.tsv @@ q.tsq
    ORDER BY rank DESC, c.id ASC
        LIMIT 10;

-- 2. Vector search by example
    -- Look up the reference chunk's embedding by its ID ($1)
    WITH reference_chunk AS (
        SELECT
            id,
            embedding
        FROM chunks
        WHERE id = $1
    )

    --  Find the 10 closest other chunks using cosine distance (<=>)
    SELECT
        c.id AS chunk_id,
        c.document_id,
        c.position,
        d.arxiv_id,
        d.title,
        -- Cosine distance: 0 = identical direction, 2 = opposite; convert to similarity (1 - distance)
        (c.embedding <=> r.embedding) AS distance,
        (1 - (c.embedding <=> r.embedding)) AS similarity
    FROM chunks AS c
             INNER JOIN documents AS d
                        ON d.id = c.document_id
             CROSS JOIN reference_chunk AS r
    -- Exclude the reference chunk itself so it doesn't show up as #1 with distance 0
    WHERE c.id <> r.id
    -- Order smallest distance first (highest similarity first); tie-break by chunk ID
    ORDER BY distance ASC, c.id ASC
        LIMIT 10;

-- 3. Plans
SET enable_seqscan = off;
SET enable_sort = off;

EXPLAIN ANALYZE
    -- Parse the raw search text ($1) into a normalized English tsquery once
WITH query AS (
    SELECT websearch_to_tsquery('english', 'retrieval augmented generation') AS tsq
)
-- Rank matching chunks per document and return the top 10 papers
SELECT
    c.id AS chunk_id,
    c.document_id,
    -- For now c.position will be 0 as we just have one chunk per document
    c.position,
    d.arxiv_id,
    d.title,
    -- fixed
    ts_rank(c.tsv, q.tsq) AS rank,
    ts_headline('english', c.content, q.tsq, 'MaxWords=35, MinWords=15') AS snippet
FROM chunks AS c
         -- Only include chunks linked to a valid parent document
         INNER JOIN documents AS d
                    ON d.id = c.document_id
         CROSS JOIN query AS q
-- Keep only chunks whose text matches the search query (Fixed)
WHERE c.tsv @@ q.tsq
ORDER BY rank DESC, c.id ASC
    LIMIT 10;

EXPLAIN ANALYZE

-- 2. Find the 10 closest other chunks using cosine distance (<=>)
SELECT
    c.id AS chunk_id,
    c.document_id,
    c.position,
    d.arxiv_id,
    d.title,
    -- Cosine distance: 0 = identical direction, 2 = opposite; convert to similarity (1 - distance)
    (c.embedding <=> (SELECT embedding FROM chunks WHERE id = 2)) AS distance,
    (1 - (c.embedding <=> (SELECT embedding FROM chunks WHERE id = 2))) AS similarity
FROM chunks AS c
         INNER JOIN documents AS d
                    ON d.id = c.document_id
-- Exclude the reference chunk itself so it doesn't show up as #1 with distance 0
WHERE c.id <> 2
-- Order smallest distance first (highest similarity first); tie-break by chunk ID
ORDER BY c.embedding <=> (SELECT embedding FROM chunks WHERE id = 2)
LIMIT 10;

RESET enable_sort;
RESET enable_seqscan;
