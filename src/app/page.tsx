"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { Calendar, ExternalLink } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  info: string | null;
  link: string | null;
}

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

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => setEvents(Array.isArray(d) ? d : []));
  }, []);

  const upcoming = events.filter((e) => !isPast(e.date));
  const past = events.filter((e) => isPast(e.date));

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

      {/* Calendário */}
      {events.length > 0 && (
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-[#E8503A]" />
            <h3 className="text-white text-sm font-semibold tracking-widest uppercase">Datas em Destaque para o Ecossistema e seus Membros</h3>
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
    </main>
  );
}
