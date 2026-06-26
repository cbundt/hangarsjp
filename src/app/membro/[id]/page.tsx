"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  LEVEL_NAMES, LEVEL_POINTS, CATEGORY_LABELS, POINT_ACTIVITIES, INTEREST_OPTIONS,
  type Member, type MemberTask, type MemberCategory, type CnaeItem,
} from "@/types";
import { searchCnae, type CnaeOption } from "@/lib/cnae";
import { fetchAddressByCep } from "@/lib/viacep";
import { CheckCircle, Edit3, X, Send, MessageSquare, Link2, Clock, Handshake, Plus } from "lucide-react";
import { HangarLogo } from "@/components/ui/HangarLogo";

const EditSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  linkedin: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram: z.string().optional(),
  organization: z.string().min(2, "Informe a organização"),
  cnpj: z.string().optional(),
  category: z.enum(["empresa","startup","institucional","universidade","poder_publico","habitat","lideranca"]),
  boarding_who: z.string().min(5, "Mínimo 5 caracteres"),
  boarding_offers: z.string().min(5, "Mínimo 5 caracteres"),
  boarding_seeks: z.string().min(5, "Mínimo 5 caracteres"),
  boarding_dream: z.string().min(5, "Mínimo 5 caracteres"),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
type EditData = z.infer<typeof EditSchema>;

export default function MembroPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [oppOpen, setOppOpen] = useState(false);
  const [oppForm, setOppForm] = useState({ title: "", description: "", type: "oferta", contact: "", expires_at: "" });
  const [oppSaving, setOppSaving] = useState(false);
  const [oppSaved, setOppSaved] = useState(false);

  // CNAE state for editing
  const [editCnaes, setEditCnaes] = useState<CnaeItem[]>([]);
  const [cnaeQuery, setCnaeQuery] = useState("");
  const [cnaeOptions, setCnaeOptions] = useState<CnaeOption[]>([]);
  const [cnaeSearching, setCnaeSearching] = useState(false);
  const cnaeRef = useRef<HTMLDivElement>(null);
  const cnaeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Interests state for editing
  const [editInterests, setEditInterests] = useState<string[]>([]);

  // CEP loading
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cnaeRef.current && !cnaeRef.current.contains(e.target as Node)) {
        setCnaeOptions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCnaeSearch = useCallback((q: string) => {
    setCnaeQuery(q);
    setCnaeOptions([]);
    if (cnaeTimer.current) clearTimeout(cnaeTimer.current);
    if (q.trim().length < 2) return;
    setCnaeSearching(true);
    cnaeTimer.current = setTimeout(async () => {
      const results = await searchCnae(q);
      setCnaeOptions(results);
      setCnaeSearching(false);
    }, 400);
  }, []);

  const addCnae = (cnae: CnaeOption) => {
    if (editCnaes.length >= 3) return;
    if (editCnaes.find((c) => c.code === cnae.code)) return;
    setEditCnaes((prev) => [...prev, { code: cnae.code, description: cnae.description, section_code: "", section_desc: "" }]);
    setCnaeQuery("");
    setCnaeOptions([]);
  };

  const removeCnae = (code: string) => setEditCnaes((prev) => prev.filter((c) => c.code !== code));

  const toggleInterest = (tag: string) => {
    setEditInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EditData>({
    resolver: zodResolver(EditSchema),
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${id}`).then((r) => r.json()),
      fetch(`/api/members/${id}/tasks`).then((r) => r.json()),
    ]).then(([m, t]) => {
      setMember(m);
      setTasks(Array.isArray(t) ? t : []);
      reset({
        name: m.name, whatsapp: m.whatsapp,
        linkedin: m.linkedin ?? "", instagram: m.instagram ?? "",
        organization: m.organization, cnpj: m.cnpj ?? "", category: m.category,
        boarding_who: m.boarding_who ?? "", boarding_offers: m.boarding_offers ?? "",
        boarding_seeks: m.boarding_seeks ?? "", boarding_dream: m.boarding_dream ?? "",
        cep: m.address?.cep ?? "", street: m.address?.street ?? "",
        number: m.address?.number ?? "", complement: m.address?.complement ?? "",
        neighborhood: m.address?.neighborhood ?? "",
        city: m.address?.city ?? "", state: m.address?.state ?? "",
      });
      setEditCnaes(m.cnaes ?? []);
      setEditInterests(m.interests ?? []);
      setLoading(false);
    });
  }, [id, reset]);

  const openEdit = () => {
    if (!member) return;
    reset({
      name: member.name, whatsapp: member.whatsapp,
      linkedin: member.linkedin ?? "", instagram: member.instagram ?? "",
      organization: member.organization, cnpj: member.cnpj ?? "", category: member.category,
      boarding_who: member.boarding_who ?? "", boarding_offers: member.boarding_offers ?? "",
      boarding_seeks: member.boarding_seeks ?? "", boarding_dream: member.boarding_dream ?? "",
      cep: member.address?.cep ?? "", street: member.address?.street ?? "",
      number: member.address?.number ?? "", complement: member.address?.complement ?? "",
      neighborhood: member.address?.neighborhood ?? "",
      city: member.address?.city ?? "", state: member.address?.state ?? "",
    });
    setEditCnaes(member.cnaes ?? []);
    setEditInterests(member.interests ?? []);
    setEditing(true);
  };

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setMsgSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: id, content: msgText }),
    });
    setMsgSending(false);
    setMsgSent(true);
    setMsgText("");
    setTimeout(() => { setMsgSent(false); setMsgOpen(false); }, 3000);
  };

  const onSave = async (data: EditData) => {
    setSaving(true);
    const { cep, street, number, complement, neighborhood, city, state, ...rest } = data;
    const address = street && number && city
      ? { cep: cep ?? "", street, number, complement, neighborhood: neighborhood ?? "", city, state: state ?? "" }
      : null;
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, cnaes: editCnaes, interests: editInterests, address }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setMember((m) => m ? {
        ...m, ...updated,
        boarding_who: data.boarding_who,
        boarding_offers: data.boarding_offers,
        boarding_seeks: data.boarding_seeks,
        boarding_dream: data.boarding_dream,
        cnaes: editCnaes,
        interests: editInterests,
      } : m);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Carregando seu painel...</div>;
  if (!member || member.id === undefined) return <div className="p-8 text-red-500">Perfil não encontrado.</div>;

  const nextLevel = member.level + 1;
  const nextLevelPoints = LEVEL_POINTS[nextLevel] ?? null;
  const progress = nextLevelPoints && nextLevelPoints !== Infinity
    ? Math.min(100, Math.round((member.points / nextLevelPoints) * 100))
    : 100;

  const pendingTasks = tasks.filter((t) => !t.completed_at);
  const doneTasks = tasks.filter((t) => t.completed_at);
  const suggestedActivities = POINT_ACTIVITIES.filter(
    (a) => !tasks.find((t) => t.title === a.title && !t.completed_at)
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <HangarLogo size={44} />
            <div>
              <h1 className="text-lg font-bold text-hangar-blue">Meu Painel</h1>
              <p className="text-xs text-gray-400">HangarSJP</p>
            </div>
          </div>
          <button
            onClick={() => setMsgOpen(!msgOpen)}
            className="inline-flex items-center gap-2 text-sm text-hangar-blue border border-hangar-blue/30 rounded-md px-3 py-2 hover:bg-hangar-blue/5 transition"
          >
            <MessageSquare size={15} />
            Falar com o Guardião
          </button>
        </div>

        {/* Caixa de mensagem */}
        {msgOpen && (
          <div className="bg-blue-50 border border-hangar-blue/20 rounded-xl p-4">
            {msgSent ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} /> Mensagem enviada ao Guardião!
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700 mb-2">Enviar mensagem ao Guardião</p>
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:border-hangar-blue focus:ring-2 focus:ring-hangar-blue/20 outline-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button type="button" size="sm" onClick={sendMessage} loading={msgSending}>
                    <Send size={13} /> Enviar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMsgOpen(false)}>Cancelar</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Perfil */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.name}</h2>
              <p className="text-sm text-gray-500">{member.organization} · {CATEGORY_LABELS[member.category as MemberCategory]}</p>
            </div>
            <button onClick={editing ? () => setEditing(false) : openEdit} className="text-gray-400 hover:text-hangar-blue">
              {editing ? <X size={18} /> : <Edit3 size={18} />}
            </button>
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            <Badge variant={`level${member.level as 0|1|2|3|4}`}>{LEVEL_NAMES[member.level]}</Badge>
            <Badge variant={member.status as "ativo"|"irregular"|"licenciado"|"excluido"}>{member.status}</Badge>
            {member.role_special && (
              <Badge variant={member.role_special as "torre_controle"|"mecanico_solo"|"controlador_rota"}>
                {member.role_special.replace(/_/g, " ")}
              </Badge>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit(onSave)} className="space-y-5">

              {/* Dados pessoais */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados de contato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nome completo" {...register("name")} error={errors.name?.message} required />
                  <Input label="WhatsApp" placeholder="(41) 99999-9999" {...register("whatsapp")} error={errors.whatsapp?.message} required />
                  <Input label="LinkedIn" placeholder="https://linkedin.com/in/..." {...register("linkedin")} error={errors.linkedin?.message} />
                  <Input label="Instagram" placeholder="@seuperfil" {...register("instagram")} />
                </div>
              </div>

              {/* Organização */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Organização</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nome da organização" {...register("organization")} error={errors.organization?.message} required />
                  <Input label="CNPJ" placeholder="00.000.000/0001-00" {...register("cnpj")} />
                </div>
                <div className="mt-3">
                  <Select
                    label="Categoria"
                    {...register("category")}
                    error={errors.category?.message}
                    required
                    placeholder="Selecione..."
                    options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  />
                </div>
              </div>

              {/* CNAEs */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CNAEs principais (até 3)</p>
                <div className="relative" ref={cnaeRef}>
                  <input
                    value={cnaeQuery}
                    onChange={(e) => handleCnaeSearch(e.target.value)}
                    placeholder="Buscar por código ou atividade..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-hangar-blue focus:ring-2 focus:ring-hangar-blue/20 outline-none"
                  />
                  {cnaeSearching && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
                  {cnaeOptions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {cnaeOptions.map((c) => (
                        <li key={c.code} onClick={() => addCnae(c)} className="px-3 py-2 text-sm cursor-pointer hover:bg-hangar-blue hover:text-white">
                          <span className="font-mono text-xs mr-2">{c.code}</span>{c.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {editCnaes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editCnaes.map((c) => (
                      <span key={c.code} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                        <span className="font-mono">{c.code}</span>
                        <button type="button" onClick={() => removeCnae(c.code)} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Interesses */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Interesses temáticos (até 3)</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`text-xs px-3 py-1 rounded-full border transition ${
                        editInterests.includes(tag)
                          ? "bg-hangar-orange text-white border-hangar-orange"
                          : "border-gray-300 text-gray-600 hover:border-hangar-orange"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Endereço</p>
                <div className="space-y-3">
                  <div className="flex gap-3 items-end">
                    <Input
                      label="CEP"
                      placeholder="00000-000"
                      {...register("cep")}
                      onBlur={async (e) => {
                        setCepLoading(true);
                        const addr = await fetchAddressByCep(e.target.value);
                        if (addr) {
                          setValue("street", addr.logradouro);
                          setValue("neighborhood", addr.bairro);
                          setValue("city", addr.localidade);
                          setValue("state", addr.uf);
                        }
                        setCepLoading(false);
                      }}
                      className="w-36"
                    />
                    {cepLoading && <p className="text-xs text-gray-400 mb-2">Buscando...</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2"><Input label="Logradouro" {...register("street")} /></div>
                    <Input label="Número" {...register("number")} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Complemento" {...register("complement")} />
                    <Input label="Bairro" {...register("neighborhood")} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Cidade" {...register("city")} />
                    <Input label="Estado" {...register("state")} />
                  </div>
                </div>
              </div>

              {/* Cartão de Bordo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cartão de Bordo</p>
                <div className="space-y-3">
                  <Textarea label="Quem sou" placeholder="Me apresento como..." {...register("boarding_who")} error={errors.boarding_who?.message} rows={2} />
                  <Textarea label="O que ofereço ao ecossistema" placeholder="Ofereço conhecimento em, acesso a..." {...register("boarding_offers")} error={errors.boarding_offers?.message} rows={2} />
                  <Textarea label="O que busco no ecossistema" placeholder="Busco parceiros para, mentoria em..." {...register("boarding_seeks")} error={errors.boarding_seeks?.message} rows={2} />
                  <Textarea label="Conexão mais esperada" placeholder="Minha conexão dos sonhos seria com alguém que..." {...register("boarding_dream")} error={errors.boarding_dream?.message} rows={2} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={saving}>Salvar alterações</Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="space-y-1 text-sm text-gray-600">
                <p>📧 {member.email}</p>
                <p>📱 {member.whatsapp}</p>
                {member.linkedin && <p>🔗 <a href={member.linkedin} target="_blank" rel="noreferrer" className="hover:underline text-hangar-blue">{member.linkedin}</a></p>}
                {member.instagram && <p>📸 {member.instagram}</p>}
                {member.cnpj && <p>🏢 CNPJ: {member.cnpj}</p>}
              </div>

              {/* CNAEs e Interesses */}
              {(member.cnaes?.length > 0 || member.interests?.length > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {member.cnaes?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CNAEs</p>
                      <div className="flex flex-wrap gap-1">
                        {member.cnaes.map((c) => (
                          <span key={c.code} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            <span className="font-mono">{c.code}</span> {c.description}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {member.interests?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Interesses</p>
                      <div className="flex flex-wrap gap-1">
                        {member.interests.map((i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-hangar-orange/10 text-hangar-orange border border-hangar-orange/20">{i}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {saved && (
            <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} /> Dados atualizados com sucesso!
            </div>
          )}
        </div>

        {/* Cartão de Bordo (view mode) */}
        {!editing && (member.boarding_who || member.boarding_offers || member.boarding_seeks || member.boarding_dream) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Meu Cartão de Bordo</h2>
            <div className="space-y-3">
              {member.boarding_who && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Quem sou</p>
                  <p className="text-sm text-gray-700">{member.boarding_who}</p>
                </div>
              )}
              {member.boarding_offers && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">O que ofereço</p>
                  <p className="text-sm text-gray-700">{member.boarding_offers}</p>
                </div>
              )}
              {member.boarding_seeks && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">O que busco</p>
                  <p className="text-sm text-gray-700">{member.boarding_seeks}</p>
                </div>
              )}
              {member.boarding_dream && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conexão dos sonhos</p>
                  <p className="text-sm text-gray-700">{member.boarding_dream}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pontuação e progresso */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Minha jornada</h2>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-3xl font-bold text-hangar-orange">{member.points} <span className="text-base font-normal text-gray-400">pontos</span></p>
              <p className="text-sm text-gray-500">Nível atual: <strong>{LEVEL_NAMES[member.level]}</strong></p>
            </div>
            {nextLevelPoints && nextLevelPoints !== Infinity && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Próximo nível</p>
                <p className="font-semibold text-hangar-blue">{LEVEL_NAMES[nextLevel]}</p>
                <p className="text-xs text-gray-400">faltam {nextLevelPoints - member.points} pts</p>
              </div>
            )}
          </div>
          {nextLevelPoints && nextLevelPoints !== Infinity && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div className="h-2 bg-hangar-orange rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="mt-4 space-y-1">
            {[0,1,2,3].map((l) => (
              <div key={l} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${member.level === l ? "bg-hangar-blue/5 border border-hangar-blue/20" : "text-gray-400"}`}>
                <span className={member.level === l ? "font-semibold text-hangar-blue" : ""}>{LEVEL_NAMES[l]}</span>
                <span>{LEVEL_POINTS[l]} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Atividades pendentes atribuídas pelo guardião */}
        {pendingTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Atividades atribuídas pelo Guardião</h2>
            <div className="space-y-3">
              {pendingTasks.map((t) => (
                <div key={t.id} className={`p-3 rounded-lg border ${t.requested_at ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                      {t.due_date && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Prazo: {new Date(t.due_date).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {t.requested_at && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">Aguardando aprovação do Guardião…</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold text-hangar-orange text-sm">{t.points} pts</p>
                      {!t.requested_at && (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/members/${id}/tasks`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ task_id: t.id, action: "request" }),
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setTasks((prev) => prev.map((x) => x.id === t.id ? updated : x));
                            }
                          }}
                          className="mt-1 text-xs text-hangar-blue border border-hangar-blue/30 rounded px-2 py-0.5 hover:bg-hangar-blue/5 transition"
                        >
                          Concluí esta atividade
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Como ganhar pontos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Como ganhar pontos</h2>
          <p className="text-xs text-gray-500 mb-4">Participe dessas atividades e informe ao Guardião para registrar seus pontos.</p>
          <div className="space-y-1">
            {suggestedActivities.map((a) => (
              <div key={a.title} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm text-gray-700">{a.title}</span>
                  <span className="ml-2 text-xs text-gray-400 capitalize">({a.category})</span>
                </div>
                <span className="font-mono text-sm font-semibold text-hangar-orange">{a.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico de concluídas — timeline */}
        {doneTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" /> Histórico de atividades
            </h2>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />
              <div className="space-y-4 ml-10">
                {doneTasks.map((t) => (
                  <div key={t.id} className="relative">
                    <div className="absolute -left-[2.75rem] top-1.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white shadow" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-gray-700 font-medium">{t.title}</p>
                        {t.completed_at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(t.completed_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-sm font-semibold text-green-600 shrink-0">+{t.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mural de Oportunidades */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Handshake size={16} className="text-hangar-orange" /> Mural de Oportunidades
            </h2>
            <button onClick={() => setOppOpen(!oppOpen)}
              className="text-xs text-hangar-orange border border-hangar-orange/30 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-hangar-orange/5 transition">
              <Plus size={13} /> Publicar
            </button>
          </div>

          {oppOpen && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
                <div className="flex gap-2">
                  {(["oferta","demanda","parceria"] as const).map((t) => (
                    <button key={t} onClick={() => setOppForm({ ...oppForm, type: t })}
                      className={`text-xs px-3 py-1 rounded-full border transition capitalize ${oppForm.type === t ? "bg-hangar-orange text-white border-hangar-orange" : "border-gray-300 text-gray-600"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Título *</label>
                <input value={oppForm.title} onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-orange/30"
                  placeholder="Ex: Consultoria em marketing digital" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Descrição *</label>
                <textarea value={oppForm.description} onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
                  rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-orange/30 resize-none"
                  placeholder="Descreva detalhes..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Contato (opcional)</label>
                  <input value={oppForm.contact} onChange={(e) => setOppForm({ ...oppForm, contact: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-orange/30"
                    placeholder="WhatsApp, e-mail, etc." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Válido até (opcional)</label>
                  <input type="date" value={oppForm.expires_at} onChange={(e) => setOppForm({ ...oppForm, expires_at: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-hangar-orange/30" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!oppForm.title || !oppForm.description) return;
                  setOppSaving(true);
                  const res = await fetch("/api/opportunities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...oppForm, member_id: id }),
                  });
                  setOppSaving(false);
                  if (res.ok) { setOppSaved(true); setOppOpen(false); setOppForm({ title: "", description: "", type: "oferta", contact: "", expires_at: "" }); }
                }} disabled={oppSaving}
                  className="text-xs bg-hangar-orange text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50">
                  {oppSaving ? "Salvando..." : "Publicar no mural"}
                </button>
                <button onClick={() => setOppOpen(false)} className="text-xs text-gray-400 px-3 py-1.5">Cancelar</button>
              </div>
              {oppSaved && (
                <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={13} /> Publicado com sucesso!</p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Veja todas as oportunidades no{" "}
            <a href="/mural" target="_blank" className="text-hangar-orange underline">Mural público →</a>
          </p>
        </div>

        {/* Link de indicação */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Link2 size={16} className="text-hangar-blue" /> Meu link de indicação
          </h2>
          <p className="text-xs text-gray-500 mb-3">Compartilhe este link. Quando alguém se inscrever pelo seu link, a indicação fica registrada.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
              {typeof window !== "undefined" ? `${window.location.origin}/cadastro?ref=${id}` : `/cadastro?ref=${id}`}
            </code>
            <button onClick={() => {
              const url = `${window.location.origin}/cadastro?ref=${id}`;
              navigator.clipboard.writeText(url);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }} className="text-xs text-hangar-blue border border-hangar-blue/30 px-3 py-2 rounded-lg hover:bg-hangar-blue/5 transition shrink-0">
              {linkCopied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Perfil público:{" "}
            <a href={`/p/${id}`} target="_blank" className="text-hangar-blue underline">ver meu perfil →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
