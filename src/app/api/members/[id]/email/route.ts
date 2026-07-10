import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import nodemailer from "nodemailer";

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
  if (!parsed.success) return NextResponse.json({ error: "Assunto e mensagem são obrigatórios." }, { status: 400 });

  const supabase = await createServiceClient();
  const { data: member, error: mErr } = await supabase
    .from("member")
    .select("name, email")
    .eq("id", id)
    .single();

  if (mErr || !member) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    // Sem credenciais: fallback para mailto
    return NextResponse.json({
      fallback: true,
      mailto: `mailto:${member.email}?subject=${encodeURIComponent(parsed.data.subject)}&body=${encodeURIComponent(parsed.data.body)}`,
    });
  }

  const html = `
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
    </div>`;

  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transport.sendMail({
      from: `HangarSJP <${gmailUser}>`,
      to: member.email,
      replyTo: gmailUser,
      subject: parsed.data.subject,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao enviar e-mail" }, { status: 500 });
  }
}
