import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";
import { isAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const login =
    typeof user.user_metadata?.user_name === "string" ? user.user_metadata.user_name : undefined;
  if (!isAllowed(login)) redirect("/login?error=not_allowed");
  return (
    <ToastProvider>
      <CommandPalette />
      {children}
    </ToastProvider>
  );
}
