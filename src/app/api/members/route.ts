import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptCpf } from "@/lib/crypto";
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

const RegisterSchema = z.object({
  // Dados do membro
  name: z.string().min(3),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  linkedin: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  organization: z.string().min(2),
  cnpj: z.string().optional(),
  category: z.enum(["empresa","startup","institucional","universidade","poder_publico","habitat","lideranca"]),
  cnaes: z.array(CnaeSchema).max(3).default([]),
  interests: z.array(z.string()).max(3).default([]),
  referred_by: z.string().uuid().optional(),
  // Cartão de Bordo
  boarding_who: z.string().min(5),
  boarding_offers: z.string().min(5),
  boarding_seeks: z.string().min(5),
  boarding_dream: z.string().min(5),
  // Consentimentos LGPD
  consent_basic: z.literal(true),
  consent_cpf: z.boolean().default(false),
  consent_public_profile: z.boolean().default(false),
  consent_address: z.boolean().default(false),
  // Dados condicionais
  cpf: z.string().optional(),
  address: AddressSchema.optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = await createServiceClient();

  // Criptografa CPF somente se consentido
  let cpfEncrypted: string | undefined;
  if (data.consent_cpf && data.cpf) {
    cpfEncrypted = encryptCpf(data.cpf.replace(/\D/g, ""));
  }

  // Cria o membro
  const { data: member, error: memberError } = await supabase
    .from("member")
    .insert({
      name: data.name,
      cpf: cpfEncrypted ?? null,
      email: data.email,
      whatsapp: data.whatsapp,
      linkedin: data.linkedin || null,
      instagram: data.instagram || null,
      organization: data.organization,
      cnpj: data.cnpj || null,
      category: data.category,
      cnaes: data.cnaes,
      address: data.consent_address && data.address ? data.address : null,
      interests: data.interests,
      referred_by: data.referred_by ?? null,
      level: 0,
      points: 0,
      status: "ativo",
    })
    .select("id")
    .single();

  if (memberError) {
    if (memberError.code === "23505") {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const memberId = member.id;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  // Registra consentimentos LGPD
  await supabase.from("member_consent").insert({
    member_id: memberId,
    consent_basic: data.consent_basic,
    consent_cpf: data.consent_cpf,
    consent_public_profile: data.consent_public_profile,
    consent_address: data.consent_address,
    ip_address: ip ?? null,
    user_agent: userAgent ?? null,
  });

  // Registra Cartão de Bordo
  await supabase.from("boarding").insert({
    member_id: memberId,
    who: data.boarding_who,
    offers: data.boarding_offers,
    seeks: data.boarding_seeks,
    dream_connection: data.boarding_dream,
    points_granted: 10,
    version: 1,
  });

  // Pontua o cadastro (10 pts pelo Cartão de Bordo)
  await supabase.from("point_event").insert({
    member_id: memberId,
    points: 10,
    category: "presenca",
    reason: "Cadastro e Cartão de Bordo concluídos",
  });

  return NextResponse.json({ id: memberId }, { status: 201 });
}

export async function GET() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("member")
    .select("id,name,organization,category,level,points,status,address")
    .order("points", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = (data ?? []).map((m: Record<string, unknown> & { address?: { city?: string } | null }) => ({
    ...m,
    city: m.address?.city ?? null,
  }));

  return NextResponse.json(members);
}
