import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  member_id: z.string().uuid(),
  title: z.string().min(5),
  description: z.string().min(10),
  type: z.enum(["oferta", "demanda", "parceria"]),
  contact: z.string().optional().or(z.literal("")),
});

export async function GET() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("opportunity")
    .select("id,title,description,type,contact,created_at,member:member_id(name,organization)")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = await createServiceClient();
  const { data, error } = await supabase.from("opportunity").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
