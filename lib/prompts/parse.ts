import type { PlaceholderSchema } from "@/lib/placeholders/types";
import matter from "gray-matter";
import { z } from "zod";
import type { PromptDoc } from "./types";

const placeholderSchemaZ: z.ZodType<PlaceholderSchema> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.string().optional(),
  }),
  z.object({
    type: z.literal("multiline"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.string().optional(),
  }),
  z.object({
    type: z.literal("number"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.number().optional(),
    suggestions: z.array(z.number()).optional(),
  }),
  z.object({
    type: z.literal("select"),
    label: z.string(),
    hint: z.string().optional(),
    options: z.array(z.union([z.string(), z.number()])),
    default: z.union([z.string(), z.number()]).optional(),
  }),
  z.object({
    type: z.literal("boolean"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("multiselect"),
    label: z.string(),
    hint: z.string().optional(),
    options: z.array(z.string()),
    default: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("date"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.string().optional(),
  }),
  z.object({
    type: z.literal("code"),
    label: z.string(),
    hint: z.string().optional(),
    language: z.string().optional(),
    default: z.string().optional(),
  }),
  z.object({
    type: z.literal("list"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("file-ref"),
    label: z.string(),
    hint: z.string().optional(),
    default: z.string().optional(),
  }),
]);

const frontmatterZ = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "id must be kebab-case"),
  title: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  estimated_time: z.string().optional(),
  agent_count: z.string().optional(),
  placeholders: z.record(placeholderSchemaZ).default({}),
});

export function parsePrompt(rawMarkdown: string, filePath: string): PromptDoc {
  const { data, content } = matter(rawMarkdown);
  const parsed = frontmatterZ.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid frontmatter in ${filePath}: ${issues}`);
  }
  return { ...parsed.data, body: content, filePath };
}
