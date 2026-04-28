import { loadAllPrompts } from "@/lib/prompts/load";
import type { PromptDoc } from "@/lib/prompts/types";
import type { Route } from "next";
import Link from "next/link";

function slugFor(p: PromptDoc): string {
  return p.filePath.replace(/^prompts\//, "").replace(/\.md$/, "");
}

export function PromptCatalog() {
  const prompts = loadAllPrompts();
  const byCategory = new Map<string, PromptDoc[]>();
  for (const p of prompts) {
    const arr = byCategory.get(p.category) ?? [];
    arr.push(p);
    byCategory.set(p.category, arr);
  }
  const groups = Array.from(byCategory.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (prompts.length === 0) {
    return <section className="text-muted font-mono text-sm text-center py-6">尚無 prompt</section>;
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xs font-mono text-fg/70 uppercase">All Prompts ({prompts.length})</h3>
      {groups.map(([category, items]) => (
        <div key={category} className="flex flex-col gap-2">
          <h4 className="text-xs font-mono text-muted">📁 {category}</h4>
          <ul className="flex flex-col gap-1">
            {items.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/prompts/${slugFor(p)}` as Route}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded border border-fg/10 hover:border-accent/60 hover:bg-fg/5"
                >
                  <span className="font-mono text-sm">{p.title}</span>
                  {p.description && (
                    <span className="font-mono text-xs text-muted line-clamp-2">
                      {p.description}
                    </span>
                  )}
                  {p.tags.length > 0 && (
                    <span className="font-mono text-[10px] text-muted/70 mt-0.5">
                      {p.tags.map((t) => `#${t}`).join(" ")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
