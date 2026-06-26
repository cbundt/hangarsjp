"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, FileText, Map, BarChart2, Users, Printer, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LEVEL_NAMES, CATEGORY_LABELS, HANGAR_LOGO_SVG,
  type Member, type MemberCategory,
} from "@/types";

const MapReport = dynamic(() => import("@/components/MapReport"), { ssr: false });

const ROLE_LABELS: Record<string, string> = {
  torre_controle: "Torre de Controle",
  mecanico_solo: "Mecânico de Solo",
  controlador_rota: "Controlador de Rota",
};

const PRINT_HEADER = `
  <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px">
    ${HANGAR_LOGO_SVG}
    <div>
      <div style="font-family:Arial Black,Arial;font-weight:900;font-size:18px;letter-spacing:1px">HangarSJP</div>
      <div style="font-size:10px;color:#666">Ecossistema de Inovação de São José dos Pinhais · PR</div>
    </div>
  </div>`;

const PRINT_FOOTER = `
  <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:2cm;border-top:1px solid #ccc;padding-top:10px">
    ${HANGAR_LOGO_SVG.replace('width="56" height="56"', 'width="24" height="24"')}
    <span style="font-size:9pt;color:#999">HangarSJP · Ecossistema de Inovação · São José dos Pinhais/PR</span>
  </div>`;

const BASE_STYLE = `
  body{font-family:Arial,sans-serif;font-size:9pt;margin:0;padding:1.5cm 2cm;color:#000}
  h1{font-size:13pt;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px}
  .sub{font-size:8pt;color:#666;margin-bottom:1cm}
  table{width:100%;border-collapse:collapse;font-size:8pt}
  thead tr{background:#111;color:#fff}
  th,td{padding:5px 7px;text-align:left;border-bottom:1px solid #e0e0e0;vertical-align:top}
  tr:nth-child(even){background:#f9f9f9}
  @media print{@page{margin:1.5cm 2cm}body{padding:0}}`;

function printWindow(title: string, body: string) {
  const today = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>${title} — HangarSJP</title>
    <style>${BASE_STYLE}</style></head><body>
    ${PRINT_HEADER}
    <h1>${title}</h1><p class="sub">Gerado em ${today}</p>
    ${body}
    ${PRINT_FOOTER}
    </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
}

// ─── Relatório 1: Completo ────────────────────────────────────────────────────
function printCompleto(members: Member[]) {
  const rows = members.map((m) => {
    const addr = m.address
      ? `${m.address.street}, ${m.address.number}${m.address.complement ? " " + m.address.complement : ""} — ${m.address.neighborhood}, ${m.address.city}/${m.address.state} · CEP ${m.address.cep}`
      : "—";
    const cnaes = (m.cnaes ?? []).map((c) => `${c.code} ${c.description}`).join("; ") || "—";
    const interests = (m.interests ?? []).join(", ") || "—";
    return `<tr>
      <td><b>${m.name}</b><br/>${m.email}<br/>${m.whatsapp}</td>
      <td>${m.organization}${m.cnpj ? `<br/><span style="color:#888">${m.cnpj}</span>` : ""}</td>
      <td>${CATEGORY_LABELS[m.category as MemberCategory] ?? m.category}</td>
      <td>${LEVEL_NAMES[m.level] ?? m.level}<br/><span style="color:#E8503A;font-weight:600">${m.points} pts</span></td>
      <td>${m.status}</td>
      <td>${m.role_special ? ROLE_LABELS[m.role_special] : "—"}</td>
      <td style="font-size:7.5pt">${addr}</td>
      <td style="font-size:7.5pt">${cnaes}</td>
      <td style="font-size:7.5pt">${interests}</td>
      <td style="font-size:7.5pt">${m.boarding_who ?? "—"}</td>
      <td style="font-size:7.5pt">${m.boarding_offers ?? "—"}</td>
      <td style="font-size:7.5pt">${m.boarding_seeks ?? "—"}</td>
      <td style="font-size:7.5pt">${m.boarding_dream ?? "—"}</td>
    </tr>`;
  }).join("");

  const body = `<table>
    <thead><tr>
      <th>Participante</th><th>Organização</th><th>Categoria</th>
      <th>Nível/Pts</th><th>Status</th><th>Papel</th>
      <th>Endereço</th><th>CNAEs</th><th>Interesses</th>
      <th>Quem sou</th><th>O que ofereço</th><th>O que busco</th><th>Conexão dos sonhos</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  printWindow("Relatório Completo de Participantes", body);
}

// ─── Relatório 2: CNAEs ───────────────────────────────────────────────────────
function printCnaes(members: Member[]) {
  const map = new Map<string, { desc: string; section: string; members: string[] }>();
  for (const m of members) {
    for (const c of m.cnaes ?? []) {
      if (!map.has(c.code)) map.set(c.code, { desc: c.description, section: c.section_desc, members: [] });
      map.get(c.code)!.members.push(`${m.name} (${m.organization})`);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1].members.length - a[1].members.length);

  const rows = sorted.map(([code, info]) => `<tr>
    <td><b>${code}</b></td>
    <td>${info.desc}</td>
    <td>${info.section}</td>
    <td style="text-align:center;font-weight:700;color:#E8503A">${info.members.length}</td>
    <td>${info.members.join("<br/>")}</td>
  </tr>`).join("");

  const semCnae = members.filter((m) => !m.cnaes?.length);
  const notaRodape = semCnae.length
    ? `<p style="font-size:8pt;color:#888;margin-top:1cm">* Sem CNAE cadastrado: ${semCnae.map((m) => m.name).join(", ")}</p>`
    : "";

  const body = `<table>
    <thead><tr>
      <th>Código</th><th>Atividade</th><th>Seção</th>
      <th style="text-align:center">Qtd</th><th>Participantes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>${notaRodape}`;

  printWindow("Relatório de CNAEs", body);
}

// ─── Relatório 4: Por categoria ───────────────────────────────────────────────
function printPorCategoria(members: Member[]) {
  const map = new Map<string, Member[]>();
  for (const m of members) {
    if (!map.has(m.category)) map.set(m.category, []);
    map.get(m.category)!.push(m);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  const total = members.length;
  const maxCount = sorted[0]?.[1].length ?? 1;

  const rows = sorted.map(([cat, list]) => {
    const pct = Math.round((list.length / total) * 100);
    const bar = Math.round((list.length / maxCount) * 200);
    return `<tr>
      <td><b>${CATEGORY_LABELS[cat as MemberCategory] ?? cat}</b></td>
      <td style="text-align:center;font-weight:700;font-size:11pt;color:#E8503A">${list.length}</td>
      <td style="text-align:center;color:#888">${pct}%</td>
      <td><div style="background:#E8503A;height:12px;width:${bar}px;border-radius:3px;display:inline-block"></div></td>
      <td style="font-size:8pt;color:#555">${list.map((m) => m.name).join(", ")}</td>
    </tr>`;
  }).join("");

  const body = `<table>
    <thead><tr>
      <th>Categoria</th><th style="text-align:center">Qtd</th>
      <th style="text-align:center">%</th><th>Distribuição</th><th>Participantes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  printWindow("Participantes por Categoria", body);
}

// ─── Relatório 5: Por nível e papel especial ──────────────────────────────────
function printPorNivel(members: Member[]) {
  // Por nível
  const levelMap = new Map<number, Member[]>();
  for (const m of members) {
    if (!levelMap.has(m.level)) levelMap.set(m.level, []);
    levelMap.get(m.level)!.push(m);
  }
  const levelRows = [...levelMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([lvl, list]) => `<tr>
      <td><b>${LEVEL_NAMES[lvl] ?? `Nível ${lvl}`}</b></td>
      <td style="text-align:center;font-weight:700;color:#E8503A">${list.length}</td>
      <td>${list.map((m) => `${m.name} (${m.points} pts)`).join("<br/>")}</td>
    </tr>`).join("");

  // Por papel especial
  const roleMap = new Map<string, Member[]>();
  for (const m of members) {
    const key = m.role_special ?? "nenhum";
    if (!roleMap.has(key)) roleMap.set(key, []);
    roleMap.get(key)!.push(m);
  }
  const roleRows = [...roleMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([role, list]) => `<tr>
      <td><b>${role === "nenhum" ? "Sem papel especial" : ROLE_LABELS[role] ?? role}</b></td>
      <td style="text-align:center;font-weight:700;color:#E8503A">${list.length}</td>
      <td>${list.map((m) => m.name).join("<br/>")}</td>
    </tr>`).join("");

  const body = `
    <h2 style="font-size:11pt;margin:0 0 8px">Por Nível de Engajamento</h2>
    <table>
      <thead><tr><th>Nível</th><th style="text-align:center">Qtd</th><th>Participantes</th></tr></thead>
      <tbody>${levelRows}</tbody>
    </table>
    <h2 style="font-size:11pt;margin:1.5cm 0 8px">Por Papel Especial</h2>
    <table>
      <thead><tr><th>Papel</th><th style="text-align:center">Qtd</th><th>Participantes</th></tr></thead>
      <tbody>${roleRows}</tbody>
    </table>`;

  printWindow("Participantes por Nível e Papel Especial", body);
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/guardian/auth", { method: "DELETE" });
    router.push("/guardian/login");
  };

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => { setMembers(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const cards = [
    {
      icon: FileText,
      title: "Relatório Completo",
      desc: "Todos os campos cadastrais: dados pessoais, organização, endereço, CNAEs, interesses e Cartão de Bordo.",
      action: () => printCompleto(members),
      color: "text-hangar-blue",
    },
    {
      icon: BarChart2,
      title: "Comparativo de CNAEs",
      desc: "Lista e compara os CNAEs cadastrados, mostrando quantos e quais participantes atuam em cada atividade econômica.",
      action: () => printCnaes(members),
      color: "text-purple-600",
    },
    {
      icon: Map,
      title: "Mapa de CEPs",
      desc: "Mapa interativo de São José dos Pinhais com a localização de cada participante por CEP. CEPs com mais de um participante mostram a quantidade.",
      action: () => {
        setShowMap(true);
        setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      color: "text-green-600",
    },
    {
      icon: Users,
      title: "Atores por Categoria",
      desc: "Quantidade de participantes em cada categoria (empresa, startup, institucional etc.) com distribuição percentual.",
      action: () => printPorCategoria(members),
      color: "text-hangar-orange",
    },
    {
      icon: BarChart2,
      title: "Níveis e Papéis Especiais",
      desc: "Distribuição de participantes por nível de engajamento e por papel especial exercido na comunidade.",
      action: () => printPorNivel(members),
      color: "text-indigo-600",
    },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/guardian/membros" className="text-gray-400 hover:text-hangar-blue">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-hangar-blue">Relatórios</h1>
              <p className="text-sm text-gray-400">HangarSJP · {members.length} participantes</p>
            </div>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1">
            <LogOut size={15} />
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando dados...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {cards.map(({ icon: Icon, title, desc, action, color }) => (
                <div key={title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={20} className={color} />
                    <h2 className="font-semibold text-gray-800">{title}</h2>
                  </div>
                  <p className="text-sm text-gray-500 flex-1">{desc}</p>
                  <button
                    onClick={action}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-hangar-blue px-4 py-2 rounded-md hover:bg-hangar-blue/90 transition w-fit"
                  >
                    <Printer size={14} />
                    {title === "Mapa de CEPs" ? "Ver mapa" : "Gerar relatório"}
                  </button>
                </div>
              ))}
            </div>

            {/* Mapa inline */}
            {showMap && (
              <div ref={mapRef} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Map size={18} className="text-green-600" /> Mapa de CEPs — São José dos Pinhais
                  </h2>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50"
                  >
                    <Printer size={13} /> Imprimir
                  </button>
                </div>
                <MapReport members={members} />
                <div className="mt-4 text-xs text-gray-400">
                  Clique nos marcadores para ver os participantes. Marcadores com número indicam mais de um participante no mesmo CEP.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
