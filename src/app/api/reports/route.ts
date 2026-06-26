import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServiceClient();

  const [{ data: members, error }, { data: boardings }] = await Promise.all([
    supabase
      .from("member")
      .select("id,name,email,whatsapp,linkedin,instagram,organization,cnpj,category,cnaes,interests,level,points,role_special,status,onboarding_date,created_at,address")
      .order("name", { ascending: true }),
    supabase
      .from("boarding")
      .select("member_id,who,offers,seeks,dream_connection")
      .order("version", { ascending: false }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const boardingMap = new Map<string, { who: string; offers: string; seeks: string; dream_connection: string }>();
  for (const b of boardings ?? []) {
    if (!boardingMap.has(b.member_id)) boardingMap.set(b.member_id, b);
  }

  const result = (members ?? []).map((m) => {
    const b = boardingMap.get(m.id);
    return {
      ...m,
      boarding_who: b?.who ?? null,
      boarding_offers: b?.offers ?? null,
      boarding_seeks: b?.seeks ?? null,
      boarding_dream: b?.dream_connection ?? null,
    };
  });

  return NextResponse.json(result);
}
