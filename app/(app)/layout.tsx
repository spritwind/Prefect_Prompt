import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("ph_session")?.value;
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected || !session || session !== expected) {
    redirect("/login");
  }
  return (
    <ToastProvider>
      <CommandPalette />
      {children}
    </ToastProvider>
  );
}
