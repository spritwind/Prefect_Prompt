import { cookies } from "next/headers";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("ph_username")?.value ?? "(未設定)";

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-3 border border-fg/10 rounded-lg p-4">
        <h3 className="text-[11px] font-mono text-fg/60 uppercase tracking-widest">Session</h3>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Username</span>
          <span className="font-mono text-sm">{username}</span>
        </div>
        <p className="font-mono text-xs text-muted">
          登入由 APP_PASSWORD 守護。Username 為個人識別（顯示用）。
        </p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="bg-red-500/15 text-red-300 hover:bg-red-500/25 px-4 py-2 rounded-md font-mono text-sm w-fit transition"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
