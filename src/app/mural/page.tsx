"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { ArrowLeft, Handshake, Search, TrendingUp } from "lucide-react";

interface Opportunity {
  id: string; title: string; description: string; type: string;
  contact: string | null; created_at: string;
  member: { name: string; organization: string } | null;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  oferta:   { label: "Oferta",   color: "text-green-400 border-green-800 bg-green-950/40" },
  demanda:  { label: "Demanda",  color: "text-amber-400 border-amber-800 bg-amber-950/40" },
  parceria: { label: "Parceria", color: "text-blue-400  border-blue-800  bg-blue-950/40"  },
};

export default function MuralPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filter, setFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/opportunities").then((r) => r.json()).then((d) => {
      setOpportunities(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "todos" ? opportunities : opportunities.filter((o) => o.type === filter);

  return (
    <main className="min-h-screen bg-[#111111] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300"><ArrowLeft size={18} /></Link>
          <HangarLogo size={36} />
          <div>
            <h1 className="text-white font-bold text-lg">Mural de Oportunidades</h1>
            <p className="text-gray-500 text-xs">HangarSJP · Ecossistema de Inovação</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["todos","oferta","demanda","parceria"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`text-xs px-4 py-1.5 rounded-full border transition capitalize ${filter === t ? "bg-[#E8503A] border-[#E8503A] text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
              {t === "todos" ? "Todos" : TYPE_LABELS[t]?.label ?? t}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-600 self-center">{filtered.length} publicação(ões)</span>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Handshake size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma oportunidade publicada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((op) => {
              const t = TYPE_LABELS[op.type] ?? { label: op.type, color: "text-gray-400 border-gray-700" };
              const Icon = op.type === "demanda" ? Search : op.type === "parceria" ? Handshake : TrendingUp;
              return (
                <div key={op.id} className={`rounded-xl border p-4 ${t.color}`}>
                  <div className="flex items-start gap-3">
                    <Icon size={16} className="mt-0.5 shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold uppercase tracking-wider`}>{t.label}</span>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-gray-400 text-xs">{op.member?.name} · {op.member?.organization}</span>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">{op.title}</h3>
                      <p className="text-gray-400 text-xs leading-relaxed">{op.description}</p>
                      {op.contact && (
                        <p className="text-gray-500 text-xs mt-2">Contato: <span className="text-gray-400">{op.contact}</span></p>
                      )}
                      <p className="text-gray-700 text-xs mt-2">
                        {new Date(op.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
