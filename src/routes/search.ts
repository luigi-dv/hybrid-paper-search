import type { FastifyPluginAsync } from "fastify";

import { EMBED_QUERY_TIMEOUT_MS, SEARCH_KEYWORD_SQL, SEARCH_VECTOR_SQL } from "@/constants";
import { toVectorLiteral } from "@/helpers";
import { embed } from "@/services/embedding";
import type { SearchResult } from "@/types";

/** The querystring after Fastify has validated it and applied the default. */
interface SearchQuery {
    q: string;
    limit: number;
}

// Shared by both routes. Fastify checks it before the handler runs: a request
// that does not match gets a 400, and "10" in the URL becomes the number 10.
const querystringSchema = {
    type: "object",
    required: ["q"],
    properties: {
        q: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
    },
} as const;

// Fastify serialises faster with a response schema, and it drops every field
// that is not listed here, so a column can never leak by mistake.
const responseSchema = {
    200: {
        type: "object",
        required: ["results"],
        properties: {
            results: {
                type: "array",
                items: {
                    type: "object",
                    required: ["arxivId", "title", "score"],
                    properties: {
                        arxivId: { type: "string" },
                        title: { type: "string" },
                        score: { type: "number" },
                    },
                },
            },
        },
    },
} as const;

const schema = { querystring: querystringSchema, response: responseSchema };

/**
 * Search routes, registered in app.ts under the prefix /search.
 * Inside this function `app.db` is the pg pool and `request.log` is the logger.
 */
export const searchRoutes: FastifyPluginAsync = async (app) => {
    // GET /search/keyword?q=...&limit=10
    app.get<{ Querystring: SearchQuery }>("/keyword", { schema }, async (request) => {
        const { q, limit } = request.query;

        const { rows } = await app.db.query<SearchResult>(SEARCH_KEYWORD_SQL, [q, limit]);
        return { results: rows };
    });

    // GET /search/vector?q=...&limit=10
    app.get<{ Querystring: SearchQuery }>("/vector", { schema }, async (request, reply) => {
        const { q, limit } = request.query;

        // The ML service is a dependency that can be down or slow. The request
        // itself is fine, so the answer is 503 and not 500. Keyword search
        // does not call the ML service and keeps working.
        let vector: number[] | undefined;
        try {
            [vector] = await embed([q], true, EMBED_QUERY_TIMEOUT_MS);
        } catch (err) {
            request.log.error(err, "embedding service failed");
        }
        if (vector === undefined) {
            return reply.code(503).send({
                statusCode: 503,
                error: "Service Unavailable",
                message: "The embedding service is not available. Keyword search still works.",
            });
        }

        const { rows } = await app.db.query<SearchResult>(SEARCH_VECTOR_SQL, [
            toVectorLiteral(vector),
            limit,
        ]);
        return { results: rows };
    });
};
