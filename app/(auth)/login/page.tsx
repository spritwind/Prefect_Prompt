"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");

  async function signIn() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user",
      },
    });
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-mono text-2xl">Prompt Hub</h1>
      {error === "not_allowed" && (
        <p className="text-red-400 text-sm font-mono">未授權的 GitHub 帳號</p>
      )}
      {error === "oauth" && <p className="text-red-400 text-sm font-mono">登入失敗，請重試</p>}
      <button
        type="button"
        onClick={signIn}
        className="bg-fg text-bg px-6 py-3 rounded-md font-medium hover:bg-fg/90"
      >
        Continue with GitHub
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
