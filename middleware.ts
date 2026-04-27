import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAllowed } from "@/lib/auth/allowlist";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const githubLogin = user.user_metadata?.user_name as string | undefined;
  if (!isAllowed(githubLogin)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|search).*)"],
};
