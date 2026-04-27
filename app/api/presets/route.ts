import { badRequest, json, unauthorized } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createBodyZ = z.object({
  prompt_id: z.string().min(1),
  name: z.string().min(1).max(120),
  values: z.record(z.unknown()),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("presets")
    .select("id, prompt_id, name, values, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return badRequest(error.message);
  return json({ presets: data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createBodyZ.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { data, error } = await supabase
    .from("presets")
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single();
  if (error) return badRequest(error.message);
  return json({ preset: data }, { status: 201 });
}
