import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const login =
    typeof user?.user_metadata?.user_name === "string" ? user.user_metadata.user_name : user?.email;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="font-mono text-xl">Settings</h1>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-mono text-fg/70 uppercase">Account</h3>
        <p className="font-mono text-sm">登入身份: {login}</p>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="bg-red-500/20 text-red-300 px-4 py-2 rounded font-mono text-sm"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
