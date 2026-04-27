import { loadAllPrompts } from "@/lib/prompts/load";
import { extractPlaceholderKeys } from "@/lib/placeholders/render";

function fail(msg: string): never {
  console.error(`\n❌ Prompt validation failed:\n   ${msg}\n`);
  process.exit(1);
}

function main() {
  const prompts = loadAllPrompts();
  console.log(`Validating ${prompts.length} prompts...`);

  // 1. Unique ids
  const seen = new Map<string, string>();
  for (const p of prompts) {
    if (seen.has(p.id)) {
      fail(`Duplicate id "${p.id}" in ${p.filePath} (also in ${seen.get(p.id)})`);
    }
    seen.set(p.id, p.filePath);
  }

  // 2. category matches actual folder path
  for (const p of prompts) {
    const expectedCategoryPath = `prompts/${p.category}/`;
    if (!p.filePath.startsWith(expectedCategoryPath)) {
      fail(
        `Category mismatch in ${p.filePath}: frontmatter says "${p.category}" but file is not under ${expectedCategoryPath}`,
      );
    }
  }

  // 3. body placeholders all defined in frontmatter (warn, not fail)
  for (const p of prompts) {
    const used = extractPlaceholderKeys(p.body);
    const defined = new Set(Object.keys(p.placeholders));
    const undef = used.filter((k) => !defined.has(k));
    if (undef.length > 0) {
      console.warn(
        `⚠️  ${p.filePath}: body uses undefined placeholders: ${undef.join(", ")} (will render as raw text)`,
      );
    }
    const unused = Array.from(defined).filter((k) => !used.includes(k));
    if (unused.length > 0) {
      console.warn(
        `⚠️  ${p.filePath}: frontmatter defines unused placeholders: ${unused.join(", ")}`,
      );
    }
  }

  console.log(`✓ ${prompts.length} prompts valid`);
}

main();
