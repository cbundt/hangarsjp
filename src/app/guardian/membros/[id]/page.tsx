"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  LEVEL_NAMES, LEVEL_POINTS, CATEGORY_LABELS, POINT_ACTIVITIES, INTEREST_OPTIONS, HANGAR_LOGO_SVG,
  type Member, type MemberTask, type MemberCategory, type CnaeItem,
} from "@/types";
import { searchCnae, type CnaeOption } from "@/lib/cnae";
import {
  ArrowLeft, Send, TrendingUp, ClipboardList, Copy, FileText,
  Edit3, X, CheckCircle, Mail, LogOut, Check, ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import { fetchAddressByCep } from "@/lib/viacep";

const LEVEL_OPTIONS = [0,1,2,3,4].map((l) => ({ value: String(l), label: `${l} — ${LEVEL_NAMES[l]}` }));
const ROLE_OPTIONS = [
  { value: "", label: "Nenhum" },
  { value: "torre_controle", label: "Torre de Controle" },
  { value: "mecanico_solo", label: "Mecânico de Solo" },
  { value: "controlador_rota", label: "Controlador de Rota" },
];

const EditSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  linkedin: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  organization: z.string().min(2),
  cnpj: z.string().optional(),
  category: z.enum(["empresa","startup","institucional","universidade","poder_publico","habitat","lideranca"]),
  boarding_who: z.string().min(5).optional().or(z.literal("")),
  boarding_offers: z.string().min(5).optional().or(z.literal("")),
  boarding_seeks: z.string().min(5).optional().or(z.literal("")),
  boarding_dream: z.string().min(5).optional().or(z.literal("")),
  status: z.enum(["ativo","irregular","licenciado","excluido"]),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
type EditData = z.infer<typeof EditSchema>;

// ── Logo SVG para impressão ──────────────────────────────────────────────────
const PRINT_HEADER = `
  <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:32px">
    ${HANGAR_LOGO_SVG}
    <div>
      <div style="font-family:Arial Black,Arial;font-weight:900;font-size:20px;color:#111;letter-spacing:1px">HangarSJP</div>
      <div style="font-size:11px;color:#666;margin-top:2px">Ecossistema de Inovação de São José dos Pinhais · PR</div>
    </div>
  </div>`;

const PRINT_FOOTER = `
  <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-top:1px solid #ccc;padding-top:12px;margin-top:40px">
    ${HANGAR_LOGO_SVG.replace('width="56" height="56"','width="28" height="28"')}
    <span style="font-size:10px;color:#999">HangarSJP · Ecossistema de Inovação · São José dos Pinhais/PR</span>
  </div>`;

function printDeclaration(member: Member) {
  const addr = member.address;
  const addrStr = addr
    ? [addr.street, addr.number, addr.complement, addr.neighborhood]
        .filter(Boolean).join(", ") + `, em ${addr.city}/${addr.state}, CEP: ${addr.cep}`
    : null;
  const today = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Declaração de Participação — ${member.organization}</title>
<style>
  body{font-family:"Times New Roman",Times,serif;font-size:12pt;margin:0;padding:2.5cm 3cm 2cm 3cm;line-height:1.8;color:#000}
  h1{text-align:center;font-size:14pt;text-transform:uppercase;font-weight:bold;margin:2cm 0 2.5cm;letter-spacing:3px}
  p{text-align:justify;margin-bottom:1em}
  .city-date{margin-top:2cm}
  .signatures{margin-top:3cm;display:flex;gap:3cm}
  .sig-line{border-top:1px solid #000;width:8cm;margin-bottom:6px}
  .sig p{text-align:left;margin:0;font-size:11pt}
  @media print{@page{margin:2.5cm 3cm 2cm 3cm}body{padding:0}}
</style></head><body>
${PRINT_HEADER}
<h1>Declaração de Participação</h1>
<p>A governança do Ecossistema de Inovação de São José dos Pinhais - HangarSJP declara, para os devidos fins, que a empresa <strong>${member.organization}</strong>${member.cnpj ? `, inscrita no CNPJ <strong>${member.cnpj}</strong>` : ""}${addrStr ? `, localizada na <strong>${addrStr}</strong>` : ""}, está devidamente inscrita e ativa no HangarSJP, contribuindo e usufruindo ativamente das atividades do ecossistema.</p>
<p>Por ser verdade, firmamos a presente declaração.</p>
<p class="city-date">São José dos Pinhais, ${today}.</p>
<div class="signatures">
  <div class="sig"><div class="sig-line"></div><p>Edgar Meante</p><p>CPF: 055.166.839-39</p></div>
  <div class="sig"><div class="sig-line"></div><p>Christian Frederico da Cunha Bundt</p><p>CPF: 730.761.470-72</p></div>
</div>
${PRINT_FOOTER}
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 600); }
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // E-mail modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // CNAE edit state
  const [editCnaes, setEditCnaes] = useState<CnaeItem[]>([]);
  const [cnaeQuery, setCnaeQuery] = useState("");
  const [cnaeOptions, setCnaeOptions] = useState<CnaeOption[]>([]);
  const [cnaeSearching, setCnaeSearching] = useState(false);
  const cnaeRef = useRef<HTMLDivElement>(null);
  const cnaeTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [editInterests, setEditInterests] = useState<string[]>([]);

  // Promoção
  const [promoteLevel, setPromoteLevel] = useState("");
  const [promoteReason, setPromoteReason] = useState("");
  const [promoting, setPromoting] = useState(false);

  // Nova tarefa
  const [taskMode, setTaskMode] = useState<"table" | "free">("table");
  const [taskActivity, setTaskActivity] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPoints, setTaskPoints] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const [copied, setCopied] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cnaeRef.current && !cnaeRef.current.contains(e.target as Node)) setCnaeOptions([]);
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
    setCnaeQuery(""); setCnaeOptions([]);
  };
  const removeCnae = (code: string) => setEditCnaes((prev) => prev.filter((c) => c.code !== code));
  const toggleInterest = (tag: string) =>
    setEditInterests((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev);

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
      setPromoteLevel(String(m.level ?? 0));
      setEditCnaes(m.cnaes ?? []);
      setEditInterests(m.interests ?? []);
      setLoading(false);
    });
  }, [id]);

  const openEdit = () => {
    if (!member) return;
    reset({
      name: member.name, email: member.email, whatsapp: member.whatsapp,
      linkedin: member.linkedin ?? "", instagram: member.instagram ?? "",
      organization: member.organization, cnpj: member.cnpj ?? "",
      category: member.category,
      boarding_who: member.boarding_who ?? "", boarding_offers: member.boarding_offers ?? "",
      boarding_seeks: member.boarding_seeks ?? "", boarding_dream: member.boarding_dream ?? "",
      status: member.status,
      cep: member.address?.cep ?? "", street: member.address?.street ?? "",
      number: member.address?.number ?? "", complement: member.address?.complement ?? "",
      neighborhood: member.address?.neighborhood ?? "",
      city: member.address?.city ?? "", state: member.address?.state ?? "",
    });
    setEditCnaes(member.cnaes ?? []);
    setEditInterests(member.interests ?? []);
    setEditing(true);
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
        boarding_who: data.boarding_who || m.boarding_who,
        boarding_offers: data.boarding_offers || m.boarding_offers,
        boarding_seeks: data.boarding_seeks || m.boarding_seeks,
        boarding_dream: data.boarding_dream || m.boarding_dream,
        cnaes: editCnaes, interests: editInterests,
      } : m);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const e = await res.json();
      alert(e.error ?? "Erro ao salvar.");
    }
  };

  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setEmailSending(true);
    const res = await fetch(`/api/members/${id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: emailSubject, body: emailBody }),
    });
    setEmailSending(false);
    const json = await res.json();
    if (json.fallback) {
      window.open(json.mailto, "_blank");
      setEmailOpen(false);
    } else if (res.ok) {
      setEmailSent(true);
      setTimeout(() => { setEmailSent(false); setEmailOpen(false); setEmailSubject(""); setEmailBody(""); }, 2500);
    } else {
      alert(json.error ?? "Erro ao enviar.");
    }
  };

  const handlePromote = async () => {
    if (!promoteReason.trim()) return alert("Informe o motivo da promoção.");
    setPromoting(true);
    const res = await fetch(`/api/members/${id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_level: Number(promoteLevel), reason: promoteReason }),
    });
    setPromoting(false);
    if (res.ok) {
      setMember((m) => m ? { ...m, level: Number(promoteLevel) } : m);
      setPromoteReason("");
      alert("Nível atualizado com sucesso!");
    } else {
      alert((await res.json()).error ?? "Erro ao promover.");
    }
  };

  const handleActivitySelect = (value: string) => {
    setTaskActivity(value);
    const act = POINT_ACTIVITIES.find((a) => a.title === value);
    if (act) { setTaskTitle(act.title); setTaskPoints(String(act.points)); setTaskCategory(act.category); }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return alert("Informe o título da atividade.");
    setSavingTask(true);
    const res = await fetch(`/api/members/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, description: taskDesc || undefined, category: taskCategory || undefined, points: Number(taskPoints) || 0, due_date: taskDue || undefined }),
    });
    setSavingTask(false);
    if (res.ok) {
      const newTask = await res.json();
      setTasks((t) => [...t, newTask]);
      setTaskTitle(""); setTaskDesc(""); setTaskPoints(""); setTaskDue(""); setTaskActivity(""); setTaskCategory("");
    } else { alert("Erro ao salvar tarefa."); }
  };

  const handleTaskAction = async (taskId: string, action: "approve" | "reject") => {
    const res = await fetch(`/api/members/${id}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t));
      if (action === "approve") {
        setMember((m) => m ? { ...m, points: m.points + (tasks.find((t) => t.id === taskId)?.points ?? 0) } : m);
      }
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/membro/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logout = async () => {
    await fetch("/api/guardian/auth", { method: "DELETE" });
    router.push("/guardian/login");
  };

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>;
  if (!member) return <div className="p-8 text-red-500">Membro não encontrado.</div>;

  const nextLevelPoints = LEVEL_POINTS[member.level + 1] ?? null;
  const progress = nextLevelPoints ? Math.min(100, Math.round((member.points / nextLevelPoints) * 100)) : 100;
  const pendingApproval = tasks.filter((t) => t.requested_at && !t.completed_at);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Topo */}
        <div className="flex items-center justify-between">
          <Link href="/guardian/membros" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-hangar-blue">
            <ArrowLeft size={16} /> Voltar à lista
          </Link>
          <button onClick={logout} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition">
            <LogOut size={14} /> Sair
          </button>
        </div>

        {/* ── Dados do membro ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
              <p className="text-sm text-gray-500">{member.organization} · {CATEGORY_LABELS[member.category as MemberCategory]}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant={`level${member.level as 0|1|2|3|4|5}`}>{LEVEL_NAMES[member.level]}</Badge>
                <Badge variant={member.status as "ativo"|"irregular"|"licenciado"|"excluido"}>{member.status}</Badge>
                {member.role_special && (
                  <Badge variant={member.role_special as "torre_controle"|"mecanico_solo"|"controlador_rota"}>
                    {member.role_special.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className="text-3xl font-bold text-hangar-orange">{member.points}</p>
                <p className="text-xs text-gray-400">pontos</p>
              </div>
              <button onClick={editing ? () => setEditing(false) : openEdit} className="text-gray-400 hover:text-hangar-blue mt-1">
                {editing ? <X size={20} /> : <Edit3 size={20} />}
              </button>
            </div>
          </div>

          {nextLevelPoints && nextLevelPoints !== Infinity && (
            <div className="mt-2 mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{member.points} pts</span>
                <span>Meta: {nextLevelPoints} pts → {LEVEL_NAMES[member.level + 1]}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 bg-hangar-orange rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {editing ? (
            <form onSubmit={handleSubmit(onSave)} className="space-y-5 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados de contato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nome completo" {...register("name")} error={errors.name?.message} required />
                  <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message} required />
                  <Input label="WhatsApp" {...register("whatsapp")} error={errors.whatsapp?.message} required />
                  <Input label="LinkedIn" placeholder="https://linkedin.com/in/..." {...register("linkedin")} error={errors.linkedin?.message} />
                  <Input label="Instagram" placeholder="@seuperfil" {...register("instagram")} />
                  <Select label="Status" {...register("status")} options={[
                    { value: "ativo", label: "Ativo" },
                    { value: "irregular", label: "Irregular" },
                    { value: "licenciado", label: "Licenciado" },
                    { value: "excluido", label: "Excluído" },
                  ]} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Organização</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nome da organização" {...register("organization")} error={errors.organization?.message} required />
                  <Input label="CNPJ" placeholder="00.000.000/0001-00" {...register("cnpj")} />
                </div>
                <div className="mt-3">
                  <Select label="Categoria" {...register("category")} error={errors.category?.message} required placeholder="Selecione..."
                    options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CNAEs principais (até 3)</p>
                <div className="relative" ref={cnaeRef}>
                  <input value={cnaeQuery} onChange={(e) => handleCnaeSearch(e.target.value)}
                    placeholder="Buscar por código ou atividade..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-hangar-blue focus:ring-2 focus:ring-hangar-blue/20 outline-none" />
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
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Interesses temáticos (até 3)</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleInterest(tag)}
                      className={`text-xs px-3 py-1 rounded-full border transition ${editInterests.includes(tag) ? "bg-hangar-orange text-white border-hangar-orange" : "border-gray-300 text-gray-600 hover:border-hangar-orange"}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Endereço</p>
                <div className="space-y-3">
                  <div className="flex gap-3 items-end">
                    <Input label="CEP" placeholder="00000-000" {...register("cep")}
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

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cartão de Bordo</p>
                <div className="space-y-3">
                  <Textarea label="Quem sou" {...register("boarding_who")} error={errors.boarding_who?.message} rows={2} />
                  <Textarea label="O que ofereço" {...register("boarding_offers")} error={errors.boarding_offers?.message} rows={2} />
                  <Textarea label="O que busco" {...register("boarding_seeks")} error={errors.boarding_seeks?.message} rows={2} />
                  <Textarea label="Conexão dos sonhos" {...register("boarding_dream")} error={errors.boarding_dream?.message} rows={2} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={saving}>Salvar alterações</Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <span>📧 <a href={`mailto:${member.email}`} className="hover:underline">{member.email}</a></span>
                <span>📱 {member.whatsapp}</span>
                {member.linkedin && <span>🔗 <a href={member.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a></span>}
                {member.instagram && <span>📸 {member.instagram}</span>}
                {member.cnpj && <span>🏢 CNPJ: {member.cnpj}</span>}
              </div>

              {(member.cnaes?.length > 0 || member.interests?.length > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {member.cnaes?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">CNAEs</p>
                      <div className="flex flex-wrap gap-2">
                        {member.cnaes.map((c) => (
                          <span key={c.code} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                            <span className="font-mono">{c.code}</span> — {c.description}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {member.interests?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Interesses</p>
                      <div className="flex flex-wrap gap-2">
                        {member.interests.map((i) => (
                          <span key={i} className="text-xs px-3 py-1 rounded-full bg-hangar-orange/10 text-hangar-orange border border-hangar-orange/20">{i}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {member.address && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Endereço</p>
                  <p className="text-sm text-gray-600">
                    {member.address.street}, {member.address.number}
                    {member.address.complement && ` / ${member.address.complement}`} — {member.address.neighborhood}
                  </p>
                  <p className="text-sm text-gray-600">{member.address.city} / {member.address.state} — CEP {member.address.cep}</p>
                </div>
              )}

              {(member.boarding_who || member.boarding_offers || member.boarding_seeks || member.boarding_dream) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Cartão de Bordo</p>
                  <div className="space-y-3">
                    {member.boarding_who && <div><p className="text-xs text-gray-400 mb-0.5">Quem sou</p><p className="text-sm text-gray-700">{member.boarding_who}</p></div>}
                    {member.boarding_offers && <div><p className="text-xs text-gray-400 mb-0.5">O que ofereço</p><p className="text-sm text-gray-700">{member.boarding_offers}</p></div>}
                    {member.boarding_seeks && <div><p className="text-xs text-gray-400 mb-0.5">O que busco</p><p className="text-sm text-gray-700">{member.boarding_seeks}</p></div>}
                    {member.boarding_dream && <div><p className="text-xs text-gray-400 mb-0.5">Conexão dos sonhos</p><p className="text-sm text-gray-700">{member.boarding_dream}</p></div>}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                <button onClick={copyLink}
                  className="inline-flex items-center gap-2 text-xs text-hangar-blue border border-hangar-blue/30 rounded-md px-3 py-1.5 hover:bg-hangar-blue/5 transition">
                  <Copy size={12} />{copied ? "Link copiado!" : "Copiar link do painel do membro"}
                </button>
                <button onClick={() => setEmailOpen(true)}
                  className="inline-flex items-center gap-2 text-xs text-gray-600 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition">
                  <Mail size={12} />Enviar e-mail
                </button>
                <button onClick={() => printDeclaration(member)}
                  className="inline-flex items-center gap-2 text-xs text-hangar-orange border border-hangar-orange/30 rounded-md px-3 py-1.5 hover:bg-hangar-orange/5 transition">
                  <FileText size={12} />Emitir Declaração de Participação
                </button>
              </div>
            </>
          )}

          {saved && (
            <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} /> Dados atualizados com sucesso!
            </div>
          )}
        </div>

        {/* ── Modal e-mail ── */}
        {emailOpen && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Mail size={16} /> Enviar e-mail para {member.name}</h2>
              <button onClick={() => setEmailOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {emailSent ? (
              <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={16} /> E-mail enviado com sucesso!</div>
            ) : (
              <div className="space-y-3">
                <Input label="Assunto" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Ex: Convite para reunião do Hangar" />
                <Textarea label="Mensagem" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5}
                  placeholder="Olá! Gostaria de informar que..." />
                <div className="flex gap-2">
                  <Button onClick={sendEmail} loading={emailSending} size="sm"><Send size={13} /> Enviar</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEmailOpen(false)}>Cancelar</Button>
                </div>
                <p className="text-xs text-gray-400">Destinatário: {member.email}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tarefas aguardando aprovação ── */}
        {pendingApproval.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-6">
            <h2 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <CheckCircle size={18} /> Atividades aguardando aprovação ({pendingApproval.length})
            </h2>
            <div className="space-y-3">
              {pendingApproval.map((t) => (
                <div key={t.id} className="bg-white rounded-lg border border-blue-200 p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Solicitado em {new Date(t.requested_at!).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold text-hangar-orange text-sm">{t.points} pts</span>
                    <button onClick={() => handleTaskAction(t.id, "approve")}
                      className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition">
                      <Check size={12} />Aprovar
                    </button>
                    <button onClick={() => handleTaskAction(t.id, "reject")}
                      className="inline-flex items-center gap-1 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition">
                      <ThumbsDown size={12} />Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Alterar nível ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-hangar-blue" /> Alterar nível
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Novo nível" value={promoteLevel} onChange={(e) => setPromoteLevel(e.target.value)} options={LEVEL_OPTIONS} />
            <div />
          </div>
          <div className="mt-3">
            <Textarea label="Motivo" placeholder="Ex: Assumiu cargo na Mesa Diretora em junho/2026"
              value={promoteReason} onChange={(e) => setPromoteReason(e.target.value)} rows={2} />
          </div>
          <div className="mt-3 flex gap-3 flex-wrap items-end">
            <Button onClick={handlePromote} loading={promoting} size="sm">Confirmar alteração</Button>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Papel especial</label>
              <select value={member.role_special ?? ""}
                onChange={async (e) => {
                  const val = e.target.value;
                  await fetch(`/api/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role_special: val || null }) });
                  setMember((m) => m ? { ...m, role_special: (val || null) as Member["role_special"] } : m);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-hangar-blue outline-none">
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Atribuir atividade ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-hangar-blue" /> Atribuir atividade
          </h2>
          <div className="flex gap-2 mb-4">
            {(["table","free"] as const).map((m) => (
              <button key={m} onClick={() => setTaskMode(m)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${taskMode === m ? "bg-hangar-blue text-white border-hangar-blue" : "border-gray-300 text-gray-600"}`}>
                {m === "table" ? "Da tabela de pontuação" : "Atividade livre"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {taskMode === "table" ? (
              <Select label="Atividade" value={taskActivity} onChange={(e) => handleActivitySelect(e.target.value)}
                placeholder="Selecione..."
                options={POINT_ACTIVITIES.map((a) => ({ value: a.title, label: `${a.title} (${a.points} pts)` }))} />
            ) : (
              <>
                <Input label="Título da atividade" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Pontos" type="number" value={taskPoints} onChange={(e) => setTaskPoints(e.target.value)} />
                  <Select label="Categoria" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} placeholder="Selecione..."
                    options={[
                      { value: "presenca", label: "Presença" }, { value: "conteudo", label: "Conteúdo" },
                      { value: "articulacao", label: "Articulação" }, { value: "governanca", label: "Governança" },
                      { value: "operacao", label: "Operação" },
                    ]} />
                </div>
              </>
            )}
            <Textarea label="Descrição (opcional)" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={2} />
            <Input label="Prazo" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            <Button onClick={handleSaveTask} loading={savingTask} size="sm"><Send size={14} /> Atribuir atividade</Button>
          </div>

          {tasks.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Todas as atividades</p>
              {tasks.map((t) => (
                <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                  t.completed_at ? "bg-green-50 border-green-200" : t.requested_at ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <div>
                    <p className="font-medium text-gray-800">{t.title}</p>
                    {t.due_date && <p className="text-xs text-gray-400">Prazo: {new Date(t.due_date).toLocaleDateString("pt-BR")}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-hangar-orange">{t.points} pts</p>
                    {t.completed_at
                      ? <span className="text-xs text-green-600">Concluída</span>
                      : t.requested_at
                      ? <span className="text-xs text-blue-600">Aguard. aprovação</span>
                      : <span className="text-xs text-gray-400">Pendente</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
