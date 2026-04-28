import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ph_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const session = request.cookies.get(COOKIE_NAME)?.value;
  const expected = process.env.APP_PASSWORD ?? "";
  if (!session || session !== expected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|search).*)"],
};
