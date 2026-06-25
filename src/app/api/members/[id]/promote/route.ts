import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { LEVEL_NAMES } from "@/types";

const Schema = z.object({
  to_level: z.number().int().min(0).max(5),
  reason: z.string().min(3),
  witnessed_by: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServiceClient();

  // Busca nível atual
  const { data: member, error: fetchError } = await supabase
    .from("member")
    .select("id, level, points")
    .eq("id", id)
    .single();

  if (fetchError || !member) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });

  const { to_level, reason, witnessed_by } = parsed.data;
  const from_level = member.level;

  if (to_level === from_level) return NextResponse.json({ error: "Membro já está nesse nível" }, { status: 400 });

  // Registra transição de nível
  await supabase.from("level_transition").insert({
    member_id: id,
    from_level,
    to_level,
    points_at_transition: member.points,
    witnessed_by: witnessed_by ?? null,
  });

  // Atualiza nível do membro
  await supabase.from("member").update({ level: to_level }).eq("id", id);

  // Registra evento de pontuação se for promoção (motivo manual)
  await supabase.from("point_event").insert({
    member_id: id,
    points: 0,
    category: "governanca",
    reason: `Promoção manual para ${LEVEL_NAMES[to_level]}: ${reason}`,
    granted_by: witnessed_by ?? null,
  });

  return NextResponse.json({ ok: true, from_level, to_level });
}
