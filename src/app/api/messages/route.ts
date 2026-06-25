import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const SendSchema = z.object({
  member_id: z.string().uuid(),
  content: z.string().min(5, "Mensagem muito curta").max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("member_message")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createServiceClient();
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

  let query = supabase
    .from("member_message")
    .select("*, member:member_id(name, organization)")
    .order("created_at", { ascending: false });

  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  const supabase = await createServiceClient();
  await supabase
    .from("member_message")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}
