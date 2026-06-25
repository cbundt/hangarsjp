import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const EmailSchema = z.object({
  subject: z.string().min(3),
  body: z.string().min(10),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = EmailSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServiceClient();
  const { data: member, error: mErr } = await supabase
    .from("member")
    .select("name, email")
    .eq("id", id)
    .single();

  if (mErr || !member) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Sem chave configurada: retorna o link mailto para o frontend usar
    return NextResponse.json({
      fallback: true,
      mailto: `mailto:${member.email}?subject=${encodeURIComponent(parsed.data.subject)}&body=${encodeURIComponent(parsed.data.body)}`,
    });
  }

  const fromEmail = process.env.RESEND_FROM ?? "HangarSJP <noreply@hangarsjp.vercel.app>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [member.email],
      subject: parsed.data.subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#111;padding:24px;text-align:center">
            <span style="color:#E8503A;font-size:22px;font-weight:900">HangarSJP</span>
            <p style="color:#999;font-size:12px;margin:4px 0 0">Ecossistema de Inovação de São José dos Pinhais</p>
          </div>
          <div style="padding:32px 24px;background:#fff">
            <p style="color:#555">Olá, <strong>${member.name}</strong>!</p>
            ${parsed.data.body.split("\n").map((l) => `<p style="color:#333;margin:8px 0">${l}</p>`).join("")}
          </div>
          <div style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:11px;color:#999">
            HangarSJP · Ecossistema de Inovação · São José dos Pinhais/PR
          </div>
        </div>`,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err?.message ?? "Erro ao enviar e-mail" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
