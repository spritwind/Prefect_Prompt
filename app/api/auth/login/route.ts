import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const redirect = String(form.get("redirect") ?? "/");
  const expected = process.env.APP_PASSWORD ?? "";

  if (!expected || password !== expected) {
    return NextResponse.redirect(new URL("/login?error=wrong", request.url), { status: 303 });
  }

  const url = new URL(redirect.startsWith("/") ? redirect : "/", request.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set("ph_session", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
