import { isAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const login = user.user_metadata?.user_name as string | undefined;
  if (!isAllowed(login)) redirect("/login?error=not_allowed");
  return <>{children}</>;
}
