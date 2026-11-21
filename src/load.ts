import { BATCH_SIZE } from "@/constants";
import { toVectorLiteral } from "@/helpers";
import { pool } from "@/services/database";
import { embed } from "@/services/embedding";
import { fetchPapers } from "@/services/papers";
import type { Paper } from "@/types";

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

const INSERT_CHUNK_SQL = `
    INSERT INTO chunks (
        document_id,
        content,
        embedding,
        position
    )
    VALUES ($1, $2, $3::vector, 0)
`;

async function main(): Promise<void> {
    const papers = await fetchPapers();
    console.log(`Fetched ${papers.length} papers from arXiv`);

    let inserted = 0;
    for (let i = 0; i < papers.length; i += BATCH_SIZE) {
        const batch = papers.slice(i, i + BATCH_SIZE);
        inserted += await loadBatch(batch);
        console.log(`Processed ${Math.min(i + BATCH_SIZE, papers.length)}/${papers.length}`);
    }
    console.log(`Done: ${inserted} new papers, ${papers.length - inserted} already loaded`);
}

/** Loads one batch in one transaction. Returns how many papers were new. */
async function loadBatch(batch: Paper[]): Promise<number> {
    if (!INSERT_DOCUMENT_SQL.trim() || !INSERT_CHUNK_SQL.trim()) {
        throw new Error("Write the two SQL statements at the top of src/load.ts first");
    }

    // Steps 1 and 2 happen BEFORE the transaction: the HTTP call is slow, and
    // a transaction should not hold a connection open while it waits.
    const texts = batch.map((paper) => `${paper.title}. ${paper.abstract}`);
    const embeddings = await embed(texts);

    // Step 3: one client for the whole transaction. pool.query() could use a
    // different connection for each statement, and then BEGIN would mean nothing.
    const client = await pool.connect();
    let inserted = 0;

    try {
        await client.query("BEGIN");

        // Step 4
        for (const [i, paper] of batch.entries()) {
            const document = await client.query<{ id: string }>(INSERT_DOCUMENT_SQL, [
                paper.arxivId,
                paper.title,
                paper.authors,
                paper.publishedDate,
            ]);

            // No row came back: the paper was already there, so it was skipped.
            const documentId = document.rows[0]?.id;
            if (documentId === undefined) continue;

            const content = texts[i];
            const embedding = embeddings[i];
            if (content === undefined || embedding === undefined) {
                throw new Error(`No embedding for paper ${paper.arxivId}`);
            }

            await client.query(INSERT_CHUNK_SQL, [documentId, content, toVectorLiteral(embedding)]);
            inserted++;
        }

        await client.query("COMMIT");
        return inserted;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        // Step 5: runs after success and after failure.
        client.release();
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
