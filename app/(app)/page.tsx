import { LastActionHero } from "@/components/home/LastActionHero";
import { PromptCatalog } from "@/components/home/PromptCatalog";
import { RecentList } from "@/components/home/RecentList";

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
      <LastActionHero />
      <RecentList />
      <PromptCatalog />
    </main>
  );
}
