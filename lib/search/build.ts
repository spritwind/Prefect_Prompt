import MiniSearch from "minisearch";
import type { PromptDoc } from "@/lib/prompts/types";
import type { SearchDoc } from "./types";

export function promptToSlug(p: PromptDoc): string {
  return p.filePath.replace(/^prompts\//, "").replace(/\.md$/, "");
}

export function buildSearchIndex(prompts: PromptDoc[]): {
  docs: SearchDoc[];
  indexJson: string;
} {
  const docs: SearchDoc[] = prompts.map((p) => ({
    id: p.id,
    slug: promptToSlug(p),
    title: p.title,
    category: p.category,
    tags: p.tags,
    description: p.description ?? "",
  }));

  const mini = new MiniSearch<SearchDoc>({
    fields: ["title", "category", "tags", "description"],
    storeFields: ["id", "slug", "title", "category", "tags", "description"],
    searchOptions: { boost: { title: 3, tags: 2 }, fuzzy: 0.2, prefix: true },
  });
  mini.addAll(docs);

  return { docs, indexJson: JSON.stringify(mini.toJSON()) };
}
