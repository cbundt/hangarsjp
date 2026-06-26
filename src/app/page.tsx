"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { Calendar, ExternalLink, Handshake, Search, TrendingUp } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  info: string | null;
  link: string | null;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  contact: string | null;
  created_at: string;
  expires_at: string | null;
  expired: boolean;
  member: { name: string; organization: string } | null;
}

const OPP_TYPE: Record<string, { label: string; color: string; border: string }> = {
  oferta:   { label: "Oferta",   color: "text-green-400",  border: "border-green-800/60" },
  demanda:  { label: "Demanda",  color: "text-amber-400",  border: "border-amber-800/60" },
  parceria: { label: "Parceria", color: "text-blue-400",   border: "border-blue-800/60"  },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long" });
}

function isPast(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dt < today;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => setEvents(Array.isArray(d) ? d : []));
    fetch("/api/opportunities").then((r) => r.json()).then((d) => setOpportunities(Array.isArray(d) ? d : []));
  }, []);

  const upcoming = events.filter((e) => !isPast(e.date));
  const past = events.filter((e) => isPast(e.date));
  const activeOpps = opportunities.filter((o) => !o.expired);

  return (
    <main className="min-h-screen bg-[#111111] flex flex-col items-center px-4 py-16">

      {/* Hero */}
      <div className="text-center max-w-lg mb-16 mt-8">
        <div className="mb-8 flex justify-center">
          <HangarLogo size={120} />
        </div>
        <h2 className="text-white text-lg font-light mb-1 tracking-widest uppercase">Ecossistema de Inovação</h2>
        <p className="text-gray-500 text-sm mb-10 tracking-wider">São José dos Pinhais · PR</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/cadastro">
            <Button size="lg" className="bg-[#E8503A] hover:bg-[#d44432] border-0 text-white w-full sm:w-auto">
              Fazer cadastro
            </Button>
          </Link>
          <Link href="/guardian/membros">
            <Button size="lg" variant="secondary" className="border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800 w-full sm:w-auto">
              Painel do Guardião
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de duas colunas */}
      {(events.length > 0 || activeOpps.length > 0) && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Coluna esquerda — Calendário */}
          {events.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-[#E8503A] shrink-0" />
                <h3 className="text-white text-xs font-semibold tracking-widest uppercase leading-snug">
                  Datas em Destaque para o Ecossistema e seus Membros
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {upcoming.map((ev) => (
                  <div key={ev.id} className="rounded-xl border border-gray-700 bg-[#1a1a1a] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#E8503A] font-medium uppercase tracking-wider mb-1">
                          {formatDate(ev.date)}
                        </p>
                        <p className="text-white font-semibold text-sm">{ev.title}</p>
                        {ev.info && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ev.info}</p>}
                      </div>
                      {ev.link && (
                        <a
                          href={ev.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-xs text-[#E8503A] border border-[#E8503A]/40 px-2.5 py-1.5 rounded-md hover:bg-[#E8503A]/10 transition"
                        >
                          Mais informações <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}

                {past.length > 0 && (
                  <>
                    <p className="text-xs text-gray-600 uppercase tracking-widest mt-2 mb-1">Datas/Eventos já transcorridos</p>
                    {past.map((ev) => (
                      <div key={ev.id} className="rounded-xl border border-gray-800 bg-[#161616] p-4 opacity-60">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                              {formatDate(ev.date)}
                            </p>
                            <p className="text-gray-400 font-semibold text-sm">{ev.title}</p>
                            {ev.info && <p className="text-gray-600 text-xs mt-1 leading-relaxed">{ev.info}</p>}
                          </div>
                          {ev.link && (
                            <a
                              href={ev.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-700 px-2.5 py-1.5 rounded-md"
                            >
                              Mais informações <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Coluna direita — Mural de Oportunidades */}
          {activeOpps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Handshake size={16} className="text-amber-500 shrink-0" />
                  <h3 className="text-white text-xs font-semibold tracking-widest uppercase">Mural de Oportunidades</h3>
                </div>
                <Link href="/mural" className="text-xs text-gray-500 hover:text-gray-300 transition">
                  ver todas →
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {activeOpps.slice(0, 6).map((op) => {
                  const t = OPP_TYPE[op.type] ?? { label: op.type, color: "text-gray-400", border: "border-gray-700" };
                  const Icon = op.type === "demanda" ? Search : op.type === "parceria" ? Handshake : TrendingUp;
                  return (
                    <div key={op.id} className={`rounded-xl border ${t.border} bg-[#1a1a1a] p-4`}>
                      <div className="flex items-start gap-3">
                        <Icon size={14} className={`mt-0.5 shrink-0 ${t.color} opacity-80`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${t.color}`}>{t.label}</span>
                            {op.member && (
                              <span className="text-gray-600 text-xs truncate">· {op.member.name}</span>
                            )}
                          </div>
                          <p className="text-white text-sm font-medium leading-snug">{op.title}</p>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">{op.description}</p>
                          {op.contact && (
                            <p className="text-gray-600 text-xs mt-1.5">Contato: <span className="text-gray-400">{op.contact}</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeOpps.length > 6 && (
                  <Link href="/mural" className="text-xs text-center text-gray-500 hover:text-gray-300 transition py-1">
                    + {activeOpps.length - 6} oportunidade(s) no mural completo →
                  </Link>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </main>
  );
}
