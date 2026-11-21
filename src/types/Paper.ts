export interface Paper {
    /** arXiv id without the version, e.g. "2511.01234" */
    arxivId: string;
    title: string;
    abstract: string;
    /** Author names in paper order */
    authors: string[];
    /** ISO date, e.g. "2026-11-20" */
    publishedDate: string;
}