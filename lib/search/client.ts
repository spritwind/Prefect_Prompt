import MiniSearch from "minisearch";
import type { SearchDoc } from "./types";

let cached: { mini: MiniSearch<SearchDoc>; docs: SearchDoc[] } | null = null;

export async function loadSearchIndex() {
  if (cached) return cached;
  const [indexJson, docsJson] = await Promise.all([
    fetch("/search/index.json").then((r) => r.text()),
    fetch("/search/docs.json").then((r) => r.json() as Promise<SearchDoc[]>),
  ]);
  const mini = MiniSearch.loadJSON<SearchDoc>(indexJson, {
    fields: ["title", "category", "tags", "description"],
    storeFields: ["id", "slug", "title", "category", "tags", "description"],
  });
  cached = { mini, docs: docsJson };
  return cached;
}

export async function search(query: string): Promise<SearchDoc[]> {
  if (!query.trim()) {
    const { docs } = await loadSearchIndex();
    return docs;
  }
  const { mini } = await loadSearchIndex();
  const results = mini.search(query, {
    boost: { title: 3, tags: 2 },
    fuzzy: 0.2,
    prefix: true,
  });
  return results as unknown as SearchDoc[];
}
