/** One row of a search response, the same shape for keyword and vector search. */
export interface SearchResult {
    arxivId: string;
    title: string;
    /** Higher is better. ts_rank for keyword search, cosine similarity for vector search. */
    score: number;
}
