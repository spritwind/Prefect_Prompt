import type { PlaceholderSchema } from "@/lib/placeholders/types";

export interface PromptDoc {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description?: string;
  estimated_time?: string;
  agent_count?: string;
  placeholders: Record<string, PlaceholderSchema>;
  body: string;
  filePath: string;
}

export interface PromptIndexEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description?: string;
  slug: string;
}
