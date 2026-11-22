-- Step 5: the two search queries, written by hand before they go into the API.
-- Run the whole file with:
--   docker compose exec -T db psql -U app -d hps < queries/search.sql

-- 1. Keyword search
-- TODO(human): top 10 papers for 'retrieval augmented generation'
--   (websearch_to_tsquery, @@, ts_rank, join documents for the title)


-- 2. Vector search by example
-- TODO(human): the 10 nearest neighbours of one chunk
--   (embedding <=> reference embedding, similarity score, exclude the chunk itself)


-- 3. Plans
-- TODO(human): copy both queries here with EXPLAIN ANALYZE in front,
--   then again between these two lines:
-- SET enable_seqscan = off;
-- RESET enable_seqscan;
