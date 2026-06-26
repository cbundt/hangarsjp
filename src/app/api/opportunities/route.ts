import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  member_id: z.string().uuid(),
  title: z.string().min(5),
  description: z.string().min(10),
  type: z.enum(["oferta", "demanda", "parceria"]),
  contact: z.string().optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const supabase = await createServiceClient();
  const all = req.nextUrl.searchParams.get("all") === "1";

  let query = supabase
    .from("opportunity")
    .select("id,title,description,type,contact,created_at,expires_at,active,member:member_id(name,organization)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const result = (data ?? []).map((o) => ({
    ...o,
    expired: !!o.expires_at && o.expires_at < today,
  }));

  // Se não for relatório do guardião, exclui as inativas (expiradas há mais de 7 dias)
  if (!all) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return NextResponse.json(result.filter((o) => !o.expires_at || o.expires_at >= cutoffStr));
  }

  return NextResponse.json(result);
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
