import { isAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("oauth exchange failed:", error);
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const githubLogin =
    typeof user?.user_metadata?.user_name === "string" ? user.user_metadata.user_name : undefined;
  if (!isAllowed(githubLogin)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_allowed", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
