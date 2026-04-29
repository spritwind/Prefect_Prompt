import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { TopNav } from "@/components/nav/TopNav";
import { ToastProvider } from "@/components/ui/Toast";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("ph_session")?.value;
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected || !session || session !== expected) {
    redirect("/login");
  }
  const username = cookieStore.get("ph_username")?.value ?? "";
  return (
    <ToastProvider>
      <CommandPalette />
      <TopNav username={username} />
      {children}
    </ToastProvider>
  );
}
