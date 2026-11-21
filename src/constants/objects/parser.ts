import { XMLParser } from "fast-xml-parser";

export const parser = new XMLParser({
    ignoreAttributes: true,
    // Without this, a feed with one entry (or a paper with one author) is parsed
    // as an object instead of an array of one element.
    isArray: (tagName) => tagName === "entry" || tagName === "author",
});
