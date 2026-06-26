import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { LEVEL_NAMES, CATEGORY_LABELS, type MemberCategory } from "@/types";
import Link from "next/link";
import { ArrowLeft, Linkedin, Instagram } from "lucide-react";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const [{ data: member }, { data: boarding }] = await Promise.all([
    supabase.from("member")
      .select("id,name,organization,category,level,points,linkedin,instagram,interests,cnaes,consent_public_profile,status")
      .eq("id", id).single(),
    supabase.from("boarding")
      .select("who,offers,seeks,dream_connection")
      .eq("member_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Não exibe se membro não existe, foi excluído ou não consentiu perfil público
  if (!member || member.status === "excluido") notFound();

  return (
    <main className="min-h-screen bg-[#111111] px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300"><ArrowLeft size={18} /></Link>
          <HangarLogo size={36} />
          <span className="text-gray-500 text-sm">Perfil do participante</span>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-white text-xl font-bold">{member.name}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{member.organization}</p>
              <p className="text-gray-600 text-xs mt-1">
                {CATEGORY_LABELS[member.category as MemberCategory] ?? member.category} ·{" "}
                {LEVEL_NAMES[member.level] ?? `Nível ${member.level}`}
              </p>
            </div>
            <div className="flex gap-2">
              {member.linkedin && (
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                  className="text-gray-500 hover:text-hangar-blue transition"><Linkedin size={18} /></a>
              )}
              {member.instagram && (
                <a href={`https://instagram.com/${member.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                  className="text-gray-500 hover:text-hangar-orange transition"><Instagram size={18} /></a>
              )}
            </div>
          </div>

          {/* Interesses */}
          {member.interests?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {member.interests.map((i: string) => (
                <span key={i} className="text-xs bg-[#111] text-gray-400 border border-gray-700 px-2.5 py-1 rounded-full">{i}</span>
              ))}
            </div>
          )}
        </div>

        {/* Cartão de Bordo */}
        {boarding && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 mb-4">
            <h2 className="text-[#E8503A] text-xs font-semibold uppercase tracking-widest mb-4">Cartão de Bordo</h2>
            <div className="space-y-3">
              {boarding.who && (
                <div><p className="text-gray-500 text-xs mb-0.5">Quem sou</p><p className="text-gray-200 text-sm">{boarding.who}</p></div>
              )}
              {boarding.offers && (
                <div><p className="text-gray-500 text-xs mb-0.5">O que ofereço</p><p className="text-gray-200 text-sm">{boarding.offers}</p></div>
              )}
              {boarding.seeks && (
                <div><p className="text-gray-500 text-xs mb-0.5">O que busco</p><p className="text-gray-200 text-sm">{boarding.seeks}</p></div>
              )}
              {boarding.dream_connection && (
                <div><p className="text-gray-500 text-xs mb-0.5">Conexão dos sonhos</p><p className="text-gray-200 text-sm">{boarding.dream_connection}</p></div>
              )}
            </div>
          </div>
        )}

        {/* CNAEs */}
        {member.cnaes?.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6">
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Atividades econômicas</h2>
            <div className="space-y-1.5">
              {member.cnaes.map((c: { code: string; description: string }) => (
                <p key={c.code} className="text-gray-400 text-xs"><span className="text-gray-600">{c.code}</span> {c.description}</p>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-8">
          Membro do ecossistema <span className="text-gray-500">HangarSJP</span> · São José dos Pinhais/PR
        </p>
      </div>
    </main>
  );
}
