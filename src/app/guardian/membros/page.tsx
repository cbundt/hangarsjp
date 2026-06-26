"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { LEVEL_NAMES, CATEGORY_LABELS, type MemberCategory } from "@/types";
import Link from "next/link";
import { Users, TrendingUp, Award, UserPlus, MessageSquare, ArrowLeft, CheckCheck, LogOut, BarChart2, Calendar, Plus, Trash2, Pencil, X, Send, Mail } from "lucide-react";
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

interface Event {
  id: string; title: string; date: string; info: string | null; link: string | null;
}

interface Broadcast {
  id: string; subject: string; body: string; filters: Record<string, unknown>;
  recipient_count: number; sent_at: string;
}

const LEVEL_FILTER_OPTIONS = [0,1,2,3,4].map((l) => ({ value: l, label: LEVEL_NAMES[l] }));
const ROLE_FILTER_OPTIONS = [
  { value: "torre_controle", label: "Torre de Controle" },
  { value: "mecanico_solo", label: "Mecânico de Solo" },
  { value: "controlador_rota", label: "Controlador de Rota" },
];
const STATUS_FILTER_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "irregular", label: "Irregular" },
  { value: "licenciado", label: "Licenciado" },
];

const EMPTY_FORM = { title: "", date: "", info: "", link: "" };

function isPast(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d) < new Date(new Date().setHours(0, 0, 0, 0));
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
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
  const [events, setEvents] = useState<Event[]>([]);
  const [tab, setTab] = useState<"membros" | "mensagens" | "eventos" | "disparos">("membros");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [eventForm, setEventForm] = useState(EMPTY_FORM);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [bSubject, setBSubject] = useState("");
  const [bBody, setBBody] = useState("");
  const [bLevels, setBLevels] = useState<number[]>([]);
  const [bRoles, setBRoles] = useState<string[]>([]);
  const [bStatuses, setBStatuses] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/guardian/auth", { method: "DELETE" });
    router.push("/guardian/login");
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/messages").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/broadcasts").then((r) => r.json()),
    ]).then(([m, msg, evs, bcs]) => {
      setMembers(Array.isArray(m) ? m : []);
      const msgs = Array.isArray(msg) ? msg : [];
      setMessages(msgs);
      setUnreadCount(msgs.filter((x: Message) => !x.read_at).length);
      setEvents(Array.isArray(evs) ? evs : []);
      setBroadcasts(Array.isArray(bcs) ? bcs : []);
      setLoading(false);
    });
  }, []);

  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.date) return;
    setSavingEvent(true);
    const method = editingEvent ? "PATCH" : "POST";
    const url = editingEvent ? `/api/events/${editingEvent}` : "/api/events";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventForm),
    });
    if (res.ok) {
      const saved: Event = await res.json();
      setEvents((prev) => editingEvent
        ? prev.map((e) => e.id === editingEvent ? saved : e)
        : [...prev, saved].sort((a, b) => a.date.localeCompare(b.date))
      );
      setEventForm(EMPTY_FORM);
      setEditingEvent(null);
    }
    setSavingEvent(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const sendBroadcast = async () => {
    if (!bSubject || !bBody) return;
    setSending(true);
    const filters = {
      ...(bLevels.length ? { levels: bLevels } : {}),
      ...(bRoles.length ? { roles: bRoles } : {}),
      ...(bStatuses.length ? { statuses: bStatuses } : {}),
    };
    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: bSubject, body: bBody, filters }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      alert(`Mensagem enviada para ${data.sent} destinatário(s).`);
      setBSubject(""); setBBody(""); setBLevels([]); setBRoles([]); setBStatuses([]);
      const updated = await fetch("/api/broadcasts").then((r) => r.json());
      setBroadcasts(Array.isArray(updated) ? updated : []);
    } else {
      alert(data.error ?? "Erro ao enviar.");
    }
  };

  const toggleFilter = <T,>(arr: T[], val: T, set: (a: T[]) => void) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const startEdit = (ev: Event) => {
    setEditingEvent(ev.id);
    setEventForm({ title: ev.title, date: ev.date, info: ev.info ?? "", link: ev.link ?? "" });
  };

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
            <Link href="/guardian/relatorios"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition">
              <BarChart2 size={15} /> Relatórios
            </Link>
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
          <button
            onClick={() => setTab("eventos")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "eventos" ? "bg-white shadow-sm text-hangar-blue" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Calendar size={15} />
            Eventos ({events.length})
          </button>
          <button
            onClick={() => setTab("disparos")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "disparos" ? "bg-white shadow-sm text-hangar-blue" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Mail size={15} />
            Disparos
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
        ) : tab === "mensagens" ? (
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
        ) : tab === "eventos" ? (
          <div className="space-y-4">
            {/* Formulário */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                {editingEvent ? <Pencil size={16} className="text-hangar-blue" /> : <Plus size={16} className="text-hangar-blue" />}
                {editingEvent ? "Editar evento" : "Novo evento"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome do evento *</label>
                  <input value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-blue/30"
                    placeholder="Ex: Reunião Ordinária de Julho" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                  <input type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-blue/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link (Mais informações)</label>
                  <input value={eventForm.link} onChange={(e) => setEventForm((f) => ({ ...f, link: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-blue/30"
                    placeholder="https://..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Informações</label>
                  <textarea value={eventForm.info} onChange={(e) => setEventForm((f) => ({ ...f, info: e.target.value }))}
                    rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-blue/30 resize-none"
                    placeholder="Detalhes sobre o evento..." />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={saveEvent} disabled={savingEvent || !eventForm.title || !eventForm.date}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-hangar-blue px-4 py-2 rounded-lg hover:bg-hangar-blue/90 transition disabled:opacity-40">
                  {savingEvent ? "Salvando..." : editingEvent ? "Salvar alterações" : "Criar evento"}
                </button>
                {editingEvent && (
                  <button onClick={() => { setEditingEvent(null); setEventForm(EMPTY_FORM); }}
                    className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 px-3 py-2">
                    <X size={14} /> Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            {events.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
                Nenhum evento cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start justify-between gap-4 ${isPast(ev.date) ? "opacity-50 border-gray-100" : "border-gray-100"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-hangar-orange font-medium mb-0.5">{fmtDate(ev.date)}{isPast(ev.date) ? " · Realizado" : ""}</p>
                      <p className="font-semibold text-gray-800 text-sm">{ev.title}</p>
                      {ev.info && <p className="text-gray-500 text-xs mt-1">{ev.info}</p>}
                      {ev.link && <a href={ev.link} target="_blank" rel="noopener noreferrer" className="text-hangar-blue text-xs hover:underline mt-1 block truncate">{ev.link}</a>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(ev)} className="p-1.5 text-gray-400 hover:text-hangar-blue transition"><Pencil size={15} /></button>
                      <button onClick={() => deleteEvent(ev.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "disparos" ? (
          <div className="space-y-4">
            {/* Formulário de disparo */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Send size={16} className="text-hangar-blue" /> Nova mensagem
              </h2>

              {/* Filtros */}
              <div className="mb-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filtrar destinatários <span className="text-gray-400 font-normal">(vazio = todos ativos)</span></p>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Nível</p>
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_FILTER_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => toggleFilter(bLevels, o.value, setBLevels)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${bLevels.includes(o.value) ? "bg-hangar-blue text-white border-hangar-blue" : "border-gray-200 text-gray-600 hover:border-hangar-blue"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Papel especial</p>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_FILTER_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => toggleFilter(bRoles, o.value, setBRoles)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${bRoles.includes(o.value) ? "bg-hangar-blue text-white border-hangar-blue" : "border-gray-200 text-gray-600 hover:border-hangar-blue"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTER_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => toggleFilter(bStatuses, o.value, setBStatuses)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${bStatuses.includes(o.value) ? "bg-hangar-blue text-white border-hangar-blue" : "border-gray-200 text-gray-600 hover:border-hangar-blue"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mensagem */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assunto *</label>
                  <input value={bSubject} onChange={(e) => setBSubject(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-blue/30"
                    placeholder="Ex: Reunião ordinária — julho/2026" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem *</label>
                  <textarea value={bBody} onChange={(e) => setBBody(e.target.value)} rows={5}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-blue/30 resize-none"
                    placeholder="Olá, membros do HangarSJP!&#10;&#10;..." />
                </div>
              </div>
              <button onClick={sendBroadcast} disabled={sending || !bSubject || !bBody}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white bg-hangar-orange px-5 py-2 rounded-lg hover:bg-hangar-orange/90 transition disabled:opacity-40">
                <Send size={14} /> {sending ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Mail size={16} className="text-gray-500" /> Histórico de disparos
              </h2>
              {broadcasts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum disparo realizado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {broadcasts.map((b) => (
                    <div key={b.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{b.subject}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(b.sent_at).toLocaleString("pt-BR")} · {b.recipient_count} destinatário(s)
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{b.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
