// arXiv API
export const ARXIV_API_URL = "https://export.arxiv.org/api/query";
export const ARXIV_SEARCH_QUERY = "cat:cs.IR OR cat:cs.CL";
// arXiv asks API clients to wait 3 seconds between requests.
export const ARXIV_DELAY_MS = 3000;

// ML service (see ml/README.md)
export const ML_URL = process.env.ML_URL ?? "http://localhost:8001";
// A search request does not wait longer than this for its query vector.
export const EMBED_QUERY_TIMEOUT_MS = 5000;

// Loader: how many papers are embedded and inserted together.
export const BATCH_SIZE = 32;

// API server
export const API_HOST = process.env.API_HOST ?? "127.0.0.1";
export const API_PORT = Number(process.env.API_PORT ?? 3000);
