import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const EventSchema = z.object({
  title: z.string().min(3).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  info: z.string().optional().or(z.literal("")),
  link: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServiceClient();
  const update = { ...parsed.data, link: parsed.data.link || null, info: parsed.data.info || null };
  const { data, error } = await supabase.from("event").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();
  const { error } = await supabase.from("event").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
