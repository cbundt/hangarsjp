import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Retorna todos os eventos de um determinado mês (year + month params)
// ou todos os eventos sem filtro se nenhum param for passado
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month"); // 1-12

  const supabase = await createServiceClient();
  let query = supabase.from("event").select("*").order("date", { ascending: true });

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    query = query.gte("date", from).lte("date", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
