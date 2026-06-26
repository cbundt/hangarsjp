import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  subject: z.string().min(3),
  body: z.string().min(10),
  filters: z.object({
    levels: z.array(z.number()).optional(),
    roles: z.array(z.string()).optional(),
    statuses: z.array(z.string()).optional(),
  }).optional(),
});

function buildEmailHtml(subject: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%">
        <!-- Header -->
        <tr><td style="background:#111111;padding:24px 32px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px">
              <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="#111111"/>
                <polygon points="28,12 88,12 88,88 12,88 12,36" fill="#E8503A"/>
                <text x="16" y="54" font-family="Arial Black,Arial" font-weight="900" font-size="22" fill="#111111">Han</text>
                <text x="16" y="74" font-family="Arial Black,Arial" font-weight="900" font-size="22" fill="#111111">gar</text>
                <text x="55" y="86" font-family="Arial Black,Arial" font-weight="900" font-size="13" fill="#111111">SJP</text>
              </svg>
            </td>
            <td>
              <div style="color:#fff;font-family:Arial Black,Arial;font-weight:900;font-size:16px;letter-spacing:1px">HangarSJP</div>
              <div style="color:#999;font-size:11px">Ecossistema de Inovação · São José dos Pinhais/PR</div>
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 20px;font-size:18px;color:#111">${subject}</h2>
          <div style="font-size:14px;color:#444;line-height:1.7;white-space:pre-wrap">${body}</div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;text-align:center">
          <p style="margin:0;font-size:11px;color:#999">HangarSJP · Ecossistema de Inovação de São José dos Pinhais</p>
          <p style="margin:4px 0 0;font-size:11px;color:#999">Esta mensagem foi enviada pelo Guardião do ecossistema.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function GET() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("broadcast")
    .select("id,subject,body,filters,recipient_count,sent_at")
    .order("sent_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, body: msgBody, filters = {} } = parsed.data;
  const supabase = await createServiceClient();

  // Busca membros com filtros
  let query = supabase.from("member").select("id,name,email,level,role_special,status");
  if (filters.levels?.length) query = query.in("level", filters.levels);
  if (filters.roles?.length) query = query.in("role_special", filters.roles);
  if (filters.statuses?.length) query = query.in("status", filters.statuses);
  else query = query.neq("status", "excluido"); // por padrão exclui excluídos

  const { data: members, error: mErr } = await query;
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!members?.length) return NextResponse.json({ error: "Nenhum destinatário encontrado." }, { status: 400 });

  const html = buildEmailHtml(subject, msgBody);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "HangarSJP <onboarding@resend.dev>";
  const replyTo = "hangarsjp@gmail.com";

  let sentCount = 0;
  const errors: string[] = [];

  if (apiKey) {
    for (const m of members) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: m.email, reply_to: replyTo, subject, html }),
        });
        if (r.ok) sentCount++;
        else errors.push(`${m.email}: ${(await r.json()).message}`);
      } catch { errors.push(m.email); }
    }
  } else {
    // Sem API key: simula envio (modo desenvolvimento)
    sentCount = members.length;
  }

  // Grava histórico
  const { data: broadcast } = await supabase
    .from("broadcast")
    .insert({ subject, body: msgBody, filters, recipient_count: sentCount })
    .select("id").single();

  if (broadcast) {
    await supabase.from("broadcast_recipient").insert(
      members.map((m) => ({ broadcast_id: broadcast.id, member_id: m.id, name: m.name, email: m.email }))
    );
  }

  return NextResponse.json({ sent: sentCount, total: members.length, errors });
}
