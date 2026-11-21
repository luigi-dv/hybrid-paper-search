import { setTimeout as sleep } from "node:timers/promises";

import { ARXIV_API_URL, ARXIV_DELAY_MS, ARXIV_SEARCH_QUERY, parser } from "@/constants";
import { collapseWhitespace } from "@/helpers";
import type { Paper, RawEntry } from "@/types";

/** Fetches `pages` pages of `pageSize` papers, newest first. */
export async function fetchPapers(pages = 3, pageSize = 100): Promise<Paper[]> {
    const papers: Paper[] = [];

    for (let page = 0; page < pages; page++) {
        // Wait between requests, but not before the first one.
        if (page > 0) await sleep(ARXIV_DELAY_MS);

        const batch = await fetchPage(page * pageSize, pageSize);
        console.log(`arXiv page ${page + 1}/${pages}: ${batch.length} papers`);
        papers.push(...batch);
    }

    return papers;
}

/** Fetches one page of results, starting at result number `start`. */
export async function fetchPage(start: number, maxResults: number): Promise<Paper[]> {
    const params = new URLSearchParams({
        search_query: ARXIV_SEARCH_QUERY,
        start: String(start),
        max_results: String(maxResults),
        sortBy: "submittedDate",
        sortOrder: "descending",
    });

    const res = await fetch(`${ARXIV_API_URL}?${params}`, {
        headers: { "user-agent": "hps-loader/0.1" },
    });
    if (!res.ok) {
        throw new Error(`arXiv answered ${res.status} for start=${start}`);
    }

    const feed = parser.parse(await res.text()).feed;
    const entries: RawEntry[] = feed?.entry ?? [];
    return entries.map(toPaper);
}

/** Converts one parsed arXiv entry into our own Paper shape. */
export function toPaper(entry: RawEntry): Paper {
    return {
        // "http://arxiv.org/abs/2511.01234v2" -> "2511.01234"
        arxivId: entry.id.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, ""),
        title: collapseWhitespace(entry.title),
        abstract: collapseWhitespace(entry.summary),
        authors: (entry.author ?? []).map((a) => collapseWhitespace(String(a.name))),
        // "2026-11-20T18:01:02Z" -> "2026-11-20"
        publishedDate: entry.published.slice(0, 10),
    };
}
