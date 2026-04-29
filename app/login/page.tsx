import { cookies } from "next/headers";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const rememberedUsername = cookieStore.get("ph_username")?.value ?? "";

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          <span className="text-accent">⌘</span> Prompt Hub
        </h1>
        <p className="text-sm text-muted">Personal prompt management for AI workflows</p>
      </div>
      <form action="/api/auth/login" method="post" className="flex flex-col gap-4 w-full max-w-xs">
        <input type="hidden" name="redirect" value={params.redirect ?? "/"} />

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] text-fg/60 uppercase tracking-widest">
            Username
          </span>
          <input
            type="text"
            name="username"
            placeholder="your-name"
            autoComplete="username"
            defaultValue={rememberedUsername}
            required
            maxLength={40}
            enterKeyHint="next"
            className="bg-fg/[0.04] border border-fg/15 rounded-lg px-4 py-3 text-base font-mono focus:border-accent focus:bg-fg/[0.08] focus:outline-none transition"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] text-fg/60 uppercase tracking-widest">
            Access password
          </span>
          <input
            type="password"
            name="password"
            placeholder="••••••"
            autoComplete="current-password"
            required
            enterKeyHint="go"
            className="bg-fg/[0.04] border border-fg/15 rounded-lg px-4 py-3 text-base font-mono focus:border-accent focus:bg-fg/[0.08] focus:outline-none transition"
          />
        </label>

        {params.error === "wrong" && (
          <p className="text-red-400 text-xs font-mono text-center">密碼錯誤，請再試</p>
        )}
        {params.error === "missing" && (
          <p className="text-red-400 text-xs font-mono text-center">請輸入 username 和密碼</p>
        )}

        <button
          type="submit"
          className="bg-accent text-bg px-6 py-3 rounded-lg font-medium hover:opacity-90 active:scale-[0.98] transition"
        >
          Continue →
        </button>
      </form>
    </main>
  );
}
