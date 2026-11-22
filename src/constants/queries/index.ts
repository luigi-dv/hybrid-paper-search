export const INSERT_DOCUMENT_SQL = `
    INSERT INTO documents (
        arxiv_id,
        title,
        authors,
        published_date
    )
    VALUES ($1, $2, $3, $4)
        ON CONFLICT (arxiv_id) DO NOTHING
    RETURNING id;
`;

export const INSERT_CHUNK_SQL = `
    INSERT INTO chunks (
        document_id,
        content,
        embedding,
        position
    )
    VALUES ($1, $2, $3::vector, 0)
`;

// Keyword search. $1 = the user's text, $2 = how many rows.
// The text is parsed once in the CTE, and c.tsv is the stored column that the
// GIN index covers.
export const SEARCH_KEYWORD_SQL = `
    WITH query AS (
        SELECT websearch_to_tsquery('english', $1) AS tsq
    )
    SELECT
        d.arxiv_id AS "arxivId",
        d.title,
        ts_rank(c.tsv, q.tsq) AS score
    FROM chunks AS c
             INNER JOIN documents AS d
                        ON d.id = c.document_id
             CROSS JOIN query AS q
    WHERE c.tsv @@ q.tsq
    ORDER BY score DESC, c.id ASC
    LIMIT $2;
`;

// Vector search. $1 = the query vector as text ('[0.1,0.2,...]'), $2 = how many rows.
// The ORDER BY keeps the exact form "column <=> value": with anything else in
// it, PostgreSQL cannot use the HNSW index.
export const SEARCH_VECTOR_SQL = `
    SELECT
        d.arxiv_id AS "arxivId",
        d.title,
        1 - (c.embedding <=> $1::vector) AS score
    FROM chunks AS c
             INNER JOIN documents AS d
                        ON d.id = c.document_id
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2;
`;
