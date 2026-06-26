import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const EventSchema = z.object({
  title: z.string().min(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  info: z.string().optional().or(z.literal("")),
  link: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const supabase = await createServiceClient();
  const today = new Date();
  const from = new Date(today); from.setDate(today.getDate() - 30);
  const to = new Date(today); to.setDate(today.getDate() + 30);

  const { data, error } = await supabase
    .from("event")
    .select("*")
    .gte("date", from.toISOString().slice(0, 10))
    .lte("date", to.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("event")
    .insert({ ...parsed.data, link: parsed.data.link || null, info: parsed.data.info || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
