"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { ArrowLeft, ArrowRight, ExternalLink, Calendar } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  info: string | null;
  link: string | null;
}

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarioPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const fetchEvents = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const res = await fetch(`/api/events/all?year=${y}&month=${m + 1}`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(year, month); }, [year, month, fetchEvents]);

  const prevMonth = () => {
    setSelected(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelected(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);

  // Map day → events
  const eventsByDay = new Map<number, Event[]>();
  for (const ev of events) {
    const d = parseInt(ev.date.split("-")[2]);
    if (!eventsByDay.has(d)) eventsByDay.set(d, []);
    eventsByDay.get(d)!.push(ev);
  }

  const selectedEvents = selected ? (eventsByDay.get(selected) ?? []) : [];
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  // Build calendar grid cells (nulls = empty leading cells)
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <main className="min-h-screen bg-[#111111] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300"><ArrowLeft size={18} /></Link>
          <HangarLogo size={36} />
          <div>
            <h1 className="text-white font-bold text-lg">Calendário</h1>
            <p className="text-gray-500 text-xs">HangarSJP · Ecossistema de Inovação</p>
          </div>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h2 className="text-white text-xl font-bold tracking-wide">{MONTH_NAMES[month]}</h2>
            <p className="text-gray-500 text-sm">{year}</p>
          </div>
          <button onClick={nextMonth} className="text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-gray-800">
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Grade do calendário */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden mb-6">

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Células dos dias */}
          {loading ? (
            <div className="py-16 text-center text-gray-600 text-sm">Carregando...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square border-b border-r border-gray-800/50 last:border-r-0" />;
                }
                const dayEvents = eventsByDay.get(day) ?? [];
                const isToday = day === todayDay;
                const isSelected = day === selected;
                const hasEvents = dayEvents.length > 0;
                const isWeekend = (firstWeekday + day - 1) % 7 === 0 || (firstWeekday + day - 1) % 7 === 6;

                return (
                  <button
                    key={day}
                    onClick={() => setSelected(isSelected ? null : day)}
                    className={`
                      aspect-square border-b border-r border-gray-800/50 last:border-r-0
                      flex flex-col items-center justify-start pt-2 gap-1
                      transition relative
                      ${isSelected ? "bg-[#E8503A]/15" : hasEvents ? "hover:bg-gray-800/60 cursor-pointer" : "hover:bg-gray-800/30"}
                      ${isWeekend && !isSelected ? "bg-gray-900/30" : ""}
                    `}
                  >
                    <span className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none
                      ${isToday ? "bg-[#E8503A] text-white" : isSelected ? "text-[#E8503A]" : isWeekend ? "text-gray-500" : "text-gray-300"}
                    `}>
                      {day}
                    </span>
                    {hasEvents && (
                      <div className="flex flex-wrap gap-0.5 justify-center px-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E8503A]" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel de eventos do dia selecionado */}
        {selected && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-5">
            <p className="text-xs text-[#E8503A] font-semibold uppercase tracking-widest mb-3">
              {selected} de {MONTH_NAMES[month]} de {year}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <Calendar size={14} /> Nenhum evento nesta data.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="border-l-2 border-[#E8503A] pl-3">
                    <p className="text-white font-semibold text-sm">{ev.title}</p>
                    {ev.info && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ev.info}</p>}
                    {ev.link && (
                      <a href={ev.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#E8503A] mt-2 hover:underline">
                        Mais informações <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista do mês */}
        {!loading && events.length > 0 && !selected && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-5">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-3">
              Eventos em {MONTH_NAMES[month]}
            </p>
            <div className="space-y-2">
              {events.map((ev) => {
                const d = parseInt(ev.date.split("-")[2]);
                return (
                  <button key={ev.id} onClick={() => setSelected(d)}
                    className="w-full text-left flex items-start gap-3 hover:bg-gray-800/40 rounded-lg p-2 transition">
                    <span className="text-[#E8503A] font-bold text-sm w-6 text-right shrink-0">{d}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{ev.title}</p>
                      {ev.info && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{ev.info}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && events.length === 0 && !selected && (
          <p className="text-center text-gray-600 text-sm py-4">Nenhum evento em {MONTH_NAMES[month]} de {year}.</p>
        )}

      </div>
    </main>
  );
}
