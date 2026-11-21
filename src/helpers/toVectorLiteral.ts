/**
 * PG Vector reads a vector from text
 * @param vector
 *@example [0.1, 0.2, 0.3]
 */
export function toVectorLiteral(vector: number[]): string {
    return `[${vector.join(",")}]`;
}
