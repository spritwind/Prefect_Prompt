import { badRequest, json, unauthorized } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodyZ = z.object({
  prompt_id: z.string().min(1),
  preset_id: z.string().uuid().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = bodyZ.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { error } = await supabase.from("recent_uses").upsert(
    {
      user_id: user.id,
      prompt_id: parsed.data.prompt_id,
      preset_id: parsed.data.preset_id,
      used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,prompt_id,preset_id" },
  );
  if (error) return badRequest(error.message);
  return json({ ok: true });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();
  const { data, error } = await supabase
    .from("recent_uses")
    .select("preset_id, prompt_id, used_at")
    .order("used_at", { ascending: false })
    .limit(10);
  if (error) return badRequest(error.message);
  return json({ recent: data });
}
