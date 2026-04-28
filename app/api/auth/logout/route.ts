import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.delete("ph_session");
  return res;
}
