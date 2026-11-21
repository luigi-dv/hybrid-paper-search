export interface RawEntry {
    id: string;
    title: string;
    summary: string;
    published: string;
    author?: { name: string }[];
}