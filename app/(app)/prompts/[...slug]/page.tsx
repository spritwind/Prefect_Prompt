import { PromptDetailClient } from "@/components/prompt/PromptDetailClient";
import { loadAllPrompts } from "@/lib/prompts/load";
import { notFound } from "next/navigation";

export const dynamic = "force-static";
export const revalidate = 60;

export async function generateStaticParams() {
  const prompts = loadAllPrompts();
  return prompts.map((p) => ({
    slug: p.filePath
      .replace(/^prompts\//, "")
      .replace(/\.md$/, "")
      .split("/"),
  }));
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const prompts = loadAllPrompts();
  const prompt = prompts.find(
    (p) => p.filePath.replace(/^prompts\//, "").replace(/\.md$/, "") === slugPath,
  );
  if (!prompt) notFound();

  return (
    <PromptDetailClient
      promptId={prompt.id}
      title={prompt.title}
      body={prompt.body}
      schema={prompt.placeholders}
    />
  );
}
