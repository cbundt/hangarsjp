"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { LEVEL_NAMES, CATEGORY_LABELS, type MemberCategory } from "@/types";
import Link from "next/link";
import { Users, TrendingUp, Award, UserPlus, MessageSquare, ArrowLeft, CheckCheck, Download, Printer, LogOut } from "lucide-react";
import { HANGAR_LOGO_SVG } from "@/types";
import { useRouter } from "next/navigation";

interface MemberRow {
  id: string; name: string; organization: string; category: string;
  level: number; points: number; status: string; city: string | null;
}

interface Message {
  id: string; content: string; created_at: string; read_at: string | null;
  member: { name: string; organization: string };
}

function exportCSV(members: MemberRow[]) {
  const header = ["Nome","Organização","Categoria","Nível","Pontos","Status","Cidade"];
  const rows = members.map((m) => [
    m.name, m.organization,
    CATEGORY_LABELS[m.category as MemberCategory] ?? m.category,
    LEVEL_NAMES[m.level] ?? `Nível ${m.level}`,
    String(m.points), m.status, m.city ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `hangarsjp-membros-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function printReport(members: MemberRow[]) {
  const today = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const rows = members.map((m) => `
    <tr>
      <td>${m.name}</td>
      <td>${m.organization}</td>
      <td>${CATEGORY_LABELS[m.category as MemberCategory] ?? m.category}</td>
      <td>${LEVEL_NAMES[m.level] ?? m.level}</td>
      <td style="text-align:right;font-weight:600">${m.points}</td>
      <td>${m.status}</td>
      <td>${m.city ?? "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Membros — HangarSJP</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10pt;margin:0;padding:1.5cm 2cm;color:#000}
  h1{font-size:14pt;margin:1.5cm 0 4px;text-transform:uppercase;letter-spacing:1px}
  .sub{font-size:9pt;color:#666;margin-bottom:1.5cm}
  table{width:100%;border-collapse:collapse;font-size:9pt}
  thead tr{background:#111;color:#fff}
  th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even){background:#f8f8f8}
  .footer{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:1.5cm;border-top:1px solid #ccc;padding-top:10px}
  .footer span{font-size:9pt;color:#999}
  @media print{@page{margin:1.5cm 2cm}body{padding:0}}
</style></head><body>
<div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:16px">
  ${HANGAR_LOGO_SVG}
  <div>
    <div style="font-family:Arial Black,Arial;font-weight:900;font-size:18px;letter-spacing:1px">HangarSJP</div>
    <div style="font-size:10px;color:#666">Ecossistema de Inovação de São José dos Pinhais · PR</div>
  </div>
</div>
<h1>Relatório de Membros</h1>
<p class="sub">Gerado em ${today} · ${members.length} membros</p>
<table>
  <thead><tr><th>Nome</th><th>Organização</th><th>Categoria</th><th>Nível</th><th style="text-align:right">Pontos</th><th>Status</th><th>Cidade</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  ${HANGAR_LOGO_SVG.replace('width="56" height="56"','width="24" height="24"')}
  <span>HangarSJP · Ecossistema de Inovação · São José dos Pinhais/PR</span>
</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500); }
}

export default function MembrosPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<"membros" | "mensagens">("membros");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/guardian/auth", { method: "DELETE" });
    router.push("/guardian/login");
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/messages").then((r) => r.json()),
    ]).then(([m, msg]) => {
      setMembers(Array.isArray(m) ? m : []);
      const msgs = Array.isArray(msg) ? msg : [];
      setMessages(msgs);
      setUnreadCount(msgs.filter((x: Message) => !x.read_at).length);
      setLoading(false);
    });
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read_at: new Date().toISOString() } : m));
    setUnreadCount((n) => Math.max(0, n - 1));
  };

  const total = members.length;
  const ativos = members.filter((m) => m.status === "ativo").length;
  const avgPoints = total > 0 ? Math.round(members.reduce((s, m) => s + m.points, 0) / total) : 0;
  const topLevel = members.filter((m) => m.level >= 2).length;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-hangar-blue">
              <ArrowLeft size={20} />
            </Link>
            <HangarLogo size={44} />
            <div>
              <h1 className="text-xl font-bold text-hangar-blue">Painel do Guardião</h1>
              <p className="text-sm text-gray-400">Jornada do Participante</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => exportCSV(members)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition">
              <Download size={15} /> CSV
            </button>
            <button onClick={() => printReport(members)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition">
              <Printer size={15} /> Relatório
            </button>
            <Link href="/cadastro"
              className="inline-flex items-center gap-2 bg-hangar-blue text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-hangar-blue/90 transition">
              <UserPlus size={16} /> Novo membro
            </Link>
            <button onClick={logout}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: "Total", value: total, color: "text-hangar-blue" },
            { icon: TrendingUp, label: "Ativos", value: ativos, color: "text-green-600" },
            { icon: Award, label: "Média pts", value: avgPoints, color: "text-hangar-orange" },
            { icon: Award, label: "Nível 2+", value: topLevel, color: "text-purple-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <Icon size={20} className={`${color} mb-2`} />
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("membros")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === "membros" ? "bg-white shadow-sm text-hangar-blue" : "text-gray-500 hover:text-gray-700"}`}
          >
            Membros ({total})
          </button>
          <button
            onClick={() => setTab("mensagens")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "mensagens" ? "bg-white shadow-sm text-hangar-blue" : "text-gray-500 hover:text-gray-700"}`}
          >
            <MessageSquare size={15} />
            Mensagens
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{unreadCount}</span>
            )}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : tab === "membros" ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Organização</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nível</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Pontos</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/guardian/membros/${m.id}`} className="hover:text-hangar-blue hover:underline">{m.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.organization}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {CATEGORY_LABELS[m.category as MemberCategory] ?? m.category}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={`level${m.level as 0|1|2|3|4|5}`}>
                          {LEVEL_NAMES[m.level] ?? `Nível ${m.level}`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-hangar-orange">{m.points}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.status as "ativo"|"irregular"|"licenciado"|"excluido"}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{m.city ?? "—"}</td>
                    </tr>
                  ))}
                  {total === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum membro cadastrado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
                Nenhuma mensagem recebida ainda.
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`bg-white rounded-xl border p-4 shadow-sm transition ${!msg.read_at ? "border-hangar-blue/30 bg-blue-50/30" : "border-gray-100"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{msg.member?.name}</span>
                      <span className="text-xs text-gray-400">{msg.member?.organization}</span>
                      {!msg.read_at && (
                        <span className="text-xs bg-hangar-blue text-white px-1.5 py-0.5 rounded-full">Nova</span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!msg.read_at && (
                    <button
                      onClick={() => markRead(msg.id)}
                      className="text-gray-400 hover:text-green-600 transition shrink-0"
                      title="Marcar como lida"
                    >
                      <CheckCheck size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
