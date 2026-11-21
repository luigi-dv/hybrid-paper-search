// arXiv API
export const ARXIV_API_URL = "https://export.arxiv.org/api/query";
export const ARXIV_SEARCH_QUERY = "cat:cs.IR OR cat:cs.CL";
// arXiv asks API clients to wait 3 seconds between requests.
export const ARXIV_DELAY_MS = 3000;

// ML service (see ml/README.md)
export const ML_URL = process.env.ML_URL ?? "http://localhost:8001";

// Loader: how many papers are embedded and inserted together.
export const BATCH_SIZE = 32;
