import { LastActionHero } from "@/components/home/LastActionHero";
import { RecentList } from "@/components/home/RecentList";

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8 min-h-dvh">
      <LastActionHero />
      <RecentList />
      <p className="text-xs text-muted text-center mt-auto">╲╱ 下拉搜尋全部 ╲╱</p>
    </main>
  );
}
