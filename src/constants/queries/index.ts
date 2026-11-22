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