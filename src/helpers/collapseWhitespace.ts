// arXiv wraps long titles and abstracts over several lines.
export function collapseWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}