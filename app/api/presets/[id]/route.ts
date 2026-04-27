import { badRequest, json, notFound, unauthorized } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const patchBodyZ = z.object({
  name: z.string().min(1).max(120).optional(),
  values: z.record(z.unknown()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = patchBodyZ.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { data, error } = await supabase
    .from("presets")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return badRequest(error.message);
  if (!data) return notFound();
  return json({ preset: data });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();
  const { error } = await supabase.from("presets").delete().eq("id", id);
  if (error) return badRequest(error.message);
  return json({ ok: true });
}
