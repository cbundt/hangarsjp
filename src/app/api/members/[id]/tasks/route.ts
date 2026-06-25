import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(["presenca","conteudo","articulacao","governanca","operacao"]).optional(),
  points: z.number().int().min(0),
  due_date: z.string().optional(),
  assigned_by: z.string().uuid().optional(),
});

const PatchSchema = z.object({
  task_id: z.string().uuid(),
  action: z.enum(["request", "approve", "reject"]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("member_task")
    .select("*")
    .eq("member_id", id)
    .order("due_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("member_task")
    .insert({ member_id: id, ...parsed.data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { task_id, action } = parsed.data;
  const supabase = await createServiceClient();

  if (action === "request") {
    const { data, error } = await supabase
      .from("member_task")
      .update({ requested_at: new Date().toISOString() })
      .eq("id", task_id)
      .eq("member_id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === "approve") {
    const { data: task, error: tErr } = await supabase
      .from("member_task")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", task_id)
      .eq("member_id", id)
      .select()
      .single();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

    // Concede os pontos ao membro
    await supabase.from("point_event").insert({
      member_id: id,
      points: task.points,
      category: task.category ?? "presenca",
      reason: `Tarefa concluída: ${task.title}`,
      reference_id: task_id,
    });

    // Atualiza pontos diretamente na tabela member
    const { data: current } = await supabase.from("member").select("points,level").eq("id", id).single();
    const newPoints = (current?.points ?? 0) + task.points;
    // Calcula novo nível automaticamente (0→15, 1→50, 2→120, 3→Comandante)
    const THRESHOLDS = [0, 15, 50, 120];
    let newLevel = current?.level ?? 0;
    if (newLevel < 4) { // não rebaixa Torre de Controle (5) nem Comandante já fixo (4)
      for (let lvl = THRESHOLDS.length - 1; lvl >= 0; lvl--) {
        if (newPoints >= THRESHOLDS[lvl]) { newLevel = lvl; break; }
      }
      if (newLevel < (current?.level ?? 0)) newLevel = current?.level ?? 0; // nunca rebaixa
    }
    await supabase.from("member").update({ points: newPoints, level: newLevel }).eq("id", id);

    return NextResponse.json(task);
  }

  if (action === "reject") {
    const { data, error } = await supabase
      .from("member_task")
      .update({ requested_at: null })
      .eq("id", task_id)
      .eq("member_id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
