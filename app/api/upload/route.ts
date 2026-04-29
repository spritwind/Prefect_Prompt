import { badRequest, json, serverError, unauthorized } from "@/lib/api/responses";
import { commitFile } from "@/lib/github/commit";
import matter from "gray-matter";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const idRegex = /^[a-z0-9][a-z0-9-]*$/;
const categoryRegex = /^[a-z0-9][a-z0-9/-]*[a-z0-9]$/;

const bodyZ = z.object({
  id: z.string().min(1).max(80).regex(idRegex, "id must be kebab-case"),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(120).regex(categoryRegex, "category must be lowercase path-safe"),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  description: z.string().max(500).optional(),
  placeholders: z.record(z.unknown()).default({}),
  body: z.string().min(1).max(200_000),
});

export async function POST(request: NextRequest) {
  // Auth check (middleware already gates, but defense in depth for /api routes)
  const session = request.cookies.get("ph_session")?.value;
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected || !session || session !== expected) return unauthorized();

  const username = request.cookies.get("ph_username")?.value || "anon";

  const raw = await request.json().catch(() => null);
  const parsed = bodyZ.safeParse(raw);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const data = parsed.data;

  // Build frontmatter object (only include keys with values)
  const frontmatter: Record<string, unknown> = {
    id: data.id,
    title: data.title,
    category: data.category,
    tags: data.tags,
  };
  if (data.description) frontmatter.description = data.description;
  if (Object.keys(data.placeholders).length > 0) frontmatter.placeholders = data.placeholders;

  let fileContent: string;
  try {
    // gray-matter stringify produces "---\n<yaml>\n---\n<body>"
    fileContent = matter.stringify(
      data.body.endsWith("\n") ? data.body : `${data.body}\n`,
      frontmatter,
    );
  } catch (err) {
    return serverError(`Frontmatter serialization failed: ${(err as Error).message}`);
  }

  const path = `prompts/${data.category}/${data.id}.md`;
  const message = `feat(prompt): add ${data.id} via web UI (${username})`;

  const result = await commitFile({
    path,
    content: fileContent,
    message,
    author: username,
  });

  if (!result.ok) return badRequest(result.error ?? "commit failed");
  return json({ ok: true, path, commitUrl: result.url });
}
