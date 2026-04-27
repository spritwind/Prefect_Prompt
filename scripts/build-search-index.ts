import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAllPrompts } from "@/lib/prompts/load";
import { buildSearchIndex } from "@/lib/search/build";

const OUT_DIR = path.join(process.cwd(), "public", "search");

function main() {
  const prompts = loadAllPrompts();
  const { docs, indexJson } = buildSearchIndex(prompts);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "index.json"), indexJson, "utf8");
  writeFileSync(path.join(OUT_DIR, "docs.json"), JSON.stringify(docs, null, 0), "utf8");

  console.log(`✓ Built search index: ${prompts.length} prompts → public/search/`);
}

main();
