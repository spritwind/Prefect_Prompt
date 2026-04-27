import { NextResponse } from "next/server";

export const json = NextResponse.json;
export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
export const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });
export const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 });
