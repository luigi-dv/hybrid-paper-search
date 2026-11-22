import { ML_URL } from "@/constants";

/**
 * Returns one 384-dimensional vector per text, in the same order.
 * Set isQuery to true only for text typed by a user in a search box.
 * With timeoutMs the call is aborted (and throws) when the ML service does not
 * answer in time. The loader sets no timeout: a batch of 32 may be slow.
 */
export async function embed(
    texts: string[],
    isQuery = false,
    timeoutMs?: number,
): Promise<number[][]> {
    const res = await fetch(`${ML_URL}/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texts, is_query: isQuery }),
        signal: timeoutMs === undefined ? null : AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
        throw new Error(`ML service answered ${res.status}: ${await res.text()}`);
    }

    const body = (await res.json()) as { embeddings: number[][] };
    if (body.embeddings.length !== texts.length) {
        throw new Error(
            `ML service returned ${body.embeddings.length} vectors for ${texts.length} texts`,
        );
    }
    return body.embeddings;
}
