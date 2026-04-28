export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="font-mono text-xl">Settings</h1>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-mono text-fg/70 uppercase">Session</h3>
        <p className="font-mono text-sm text-muted">登入由 APP_PASSWORD 守護</p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="bg-red-500/20 text-red-300 px-4 py-2 rounded font-mono text-sm w-fit"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
