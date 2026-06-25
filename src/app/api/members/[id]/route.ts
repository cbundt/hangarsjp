import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const CnaeSchema = z.object({
  code: z.string(),
  description: z.string(),
  section_code: z.string(),
  section_desc: z.string(),
});

const AddressSchema = z.object({
  street: z.string(),
  number: z.string(),
  complement: z.string().optional(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  cep: z.string(),
});

const UpdateSchema = z.object({
  name: z.string().min(3).optional(),
  whatsapp: z.string().min(10).optional(),
  linkedin: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  organization: z.string().min(2).optional(),
  cnpj: z.string().optional().or(z.literal("")),
  category: z.enum(["empresa","startup","institucional","universidade","poder_publico","habitat","lideranca"]).optional(),
  cnaes: z.array(CnaeSchema).max(3).optional(),
  interests: z.array(z.string()).max(3).optional(),
  address: AddressSchema.nullable().optional(),
  role_special: z.enum(["torre_controle","mecanico_solo","controlador_rota"]).nullable().optional(),
  status: z.enum(["ativo","irregular","licenciado","excluido"]).optional(),
  onboarding_date: z.string().optional(),
  // Cartão de Bordo (tabela boarding)
  boarding_who: z.string().min(5).optional().or(z.literal("")),
  boarding_offers: z.string().min(5).optional().or(z.literal("")),
  boarding_seeks: z.string().min(5).optional().or(z.literal("")),
  boarding_dream: z.string().min(5).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const [{ data, error }, { data: boarding }] = await Promise.all([
    supabase
      .from("member")
      .select("id,name,email,whatsapp,linkedin,instagram,organization,cnpj,category,cnaes,interests,level,points,role_special,status,onboarding_date,created_at,address")
      .eq("id", id)
      .single(),
    supabase
      .from("boarding")
      .select("who,offers,seeks,dream_connection")
      .eq("member_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  return NextResponse.json({
    ...data,
    boarding_who: boarding?.who ?? null,
    boarding_offers: boarding?.offers ?? null,
    boarding_seeks: boarding?.seeks ?? null,
    boarding_dream: boarding?.dream_connection ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { boarding_who, boarding_offers, boarding_seeks, boarding_dream, ...memberFields } = parsed.data;

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("member")
    .update(memberFields)
    .eq("id", id)
    .select("id,name,email,whatsapp,linkedin,instagram,organization,cnpj,category,cnaes,interests,level,points,status,address")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Atualiza Cartão de Bordo se algum campo foi enviado
  if (boarding_who || boarding_offers || boarding_seeks || boarding_dream) {
    const boardingUpdate: Record<string, string> = {};
    if (boarding_who) boardingUpdate.who = boarding_who;
    if (boarding_offers) boardingUpdate.offers = boarding_offers;
    if (boarding_seeks) boardingUpdate.seeks = boarding_seeks;
    if (boarding_dream) boardingUpdate.dream_connection = boarding_dream;

    const { data: existing } = await supabase
      .from("boarding")
      .select("id")
      .eq("member_id", id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from("boarding").update(boardingUpdate).eq("id", existing.id);
    } else {
      await supabase.from("boarding").insert({ member_id: id, ...boardingUpdate, version: 1, points_granted: 0 });
    }
  }

  return NextResponse.json(data);
}
