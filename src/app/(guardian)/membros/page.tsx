import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { LEVEL_NAMES, CATEGORY_LABELS, type MemberCategory } from "@/types";
import Link from "next/link";
import { Users, TrendingUp, Award, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MembrosPage() {
  const supabase = await createServiceClient();
  const { data: members, error } = await supabase
    .from("member_report")
    .select("*")
    .order("points", { ascending: false });

  if (error) {
    return <p className="p-8 text-red-600">Erro ao carregar membros: {error.message}</p>;
  }

  const total = members?.length ?? 0;
  const ativos = members?.filter((m) => m.status === "ativo").length ?? 0;
  const avgPoints = total > 0
    ? Math.round((members ?? []).reduce((s, m) => s + m.points, 0) / total)
    : 0;
  const topLevel = members?.filter((m) => m.level >= 2).length ?? 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-hangar-blue">Painel do Guardião</h1>
            <p className="text-sm text-gray-500">HangarSJP — Jornada do Participante</p>
          </div>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 bg-hangar-blue text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-hangar-blue/90 transition"
          >
            <UserPlus size={16} />
            Novo membro
          </Link>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: "Total", value: total, color: "text-hangar-blue" },
            { icon: TrendingUp, label: "Ativos", value: ativos, color: "text-green-600" },
            { icon: Award, label: "Média de pontos", value: avgPoints, color: "text-hangar-orange" },
            { icon: Award, label: "Nível 2+", value: topLevel, color: "text-purple-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <Icon size={20} className={`${color} mb-2`} />
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabela */}
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
                {(members ?? []).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.organization}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {CATEGORY_LABELS[m.category as MemberCategory] ?? m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={`level${m.level as 0|1|2|3|4}`}>
                        {LEVEL_NAMES[m.level] ?? `Nível ${m.level}`}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-hangar-orange">
                      {m.points}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={m.status as "ativo"|"irregular"|"licenciado"|"excluido"}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.city ?? "—"}</td>
                  </tr>
                ))}
                {total === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      Nenhum membro cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
