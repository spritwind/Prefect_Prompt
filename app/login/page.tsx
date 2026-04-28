export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-mono text-2xl">Prompt Hub</h1>
      {params.error === "wrong" && <p className="text-red-400 text-sm font-mono">密碼錯誤</p>}
      <form action="/api/auth/login" method="post" className="flex flex-col gap-3 w-full max-w-xs">
        <input type="hidden" name="redirect" value={params.redirect ?? "/"} />
        <input
          // biome-ignore lint/a11y/noAutofocus: single-purpose login screen, autofocus improves UX
          autoFocus
          type="password"
          name="password"
          placeholder="Access password"
          autoComplete="current-password"
          className="bg-bg border border-fg/20 rounded px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="bg-fg text-bg px-6 py-3 rounded-md font-mono font-medium hover:bg-fg/90"
        >
          Enter
        </button>
      </form>
    </main>
  );
}
