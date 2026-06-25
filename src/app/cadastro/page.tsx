"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { fetchAddressByCep } from "@/lib/viacep";
import { searchCnae, type CnaeOption } from "@/lib/cnae";
import { CATEGORY_LABELS, INTEREST_OPTIONS } from "@/types";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { HangarLogo } from "@/components/ui/HangarLogo";
import Link from "next/link";

// ─── Schema de validação ───────────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    whatsapp: z.string().min(10, "WhatsApp inválido"),
    linkedin: z.string().url("URL inválida").optional().or(z.literal("")),
    instagram: z.string().optional(),
    organization: z.string().min(2, "Informe a organização"),
    cnpj: z.string().optional(),
    category: z.enum(
      ["empresa","startup","institucional","universidade","poder_publico","habitat","lideranca"],
      { message: "Selecione uma categoria" }
    ),
    interests: z.array(z.string()).max(3, "Máximo 3 interesses"),
    boarding_who: z.string().min(5, "Descreva quem você é"),
    boarding_offers: z.string().min(5, "Descreva o que você oferece"),
    boarding_seeks: z.string().min(5, "Descreva o que você busca"),
    boarding_dream: z.string().min(5, "Descreva sua conexão ideal"),
    consent_basic: z.boolean().refine((v) => v, "Consentimento obrigatório"),
    consent_cpf: z.boolean().default(false),
    consent_public_profile: z.boolean().default(false),
    consent_address: z.boolean().default(false),
    cpf: z.string().optional(),
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.consent_cpf && !data.cpf) {
      ctx.addIssue({ code: "custom", path: ["cpf"], message: "CPF obrigatório se consentido" });
    }
    if (data.consent_address && !data.cep) {
      ctx.addIssue({ code: "custom", path: ["cep"], message: "CEP obrigatório se consentido" });
    }
  });

type FormData = z.infer<typeof schema>;

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CadastroPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [selectedCnaes, setSelectedCnaes] = useState<CnaeOption[]>([]);
  const [cnaeQuery, setCnaeQuery] = useState("");
  const [cnaeOptions, setCnaeOptions] = useState<CnaeOption[]>([]);
  const [cnaeSearching, setCnaeSearching] = useState(false);
  const cnaeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cnaeRef.current && !cnaeRef.current.contains(e.target as Node)) {
        setCnaeOptions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      interests: [],
      consent_basic: false,
      consent_cpf: false,
      consent_public_profile: false,
      consent_address: false,
    },
  });

  const watchConsentCpf = watch("consent_cpf");
  const watchConsentAddress = watch("consent_address");
  const watchInterests = watch("interests") ?? [];

  // ── Busca de CNAE ──────────────────────────────────────────────────────────

  const cnaeTimer = useRef<ReturnType<typeof setTimeout>>(null);
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
    if (selectedCnaes.length >= 3) return;
    if (selectedCnaes.find((c) => c.code === cnae.code)) return;
    setSelectedCnaes((prev) => [...prev, cnae]);
    setCnaeQuery("");
    setCnaeOptions([]);
  };

  const removeCnae = (code: string) =>
    setSelectedCnaes((prev) => prev.filter((c) => c.code !== code));

  // ── Auto-preenchimento CEP ─────────────────────────────────────────────────

  const handleCepBlur = async (cep: string) => {
    setCepLoading(true);
    const addr = await fetchAddressByCep(cep);
    if (addr) {
      setValue("street", addr.logradouro);
      setValue("neighborhood", addr.bairro);
      setValue("city", addr.localidade);
      setValue("state", addr.uf);
    }
    setCepLoading(false);
  };

  // ── Toggle interesse ───────────────────────────────────────────────────────

  const toggleInterest = (tag: string) => {
    const current = watchInterests;
    if (current.includes(tag)) {
      setValue("interests", current.filter((t) => t !== tag));
    } else if (current.length < 3) {
      setValue("interests", [...current, tag]);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const payload = {
      ...data,
      cnaes: selectedCnaes,
      address: data.consent_address
        ? {
            street: data.street,
            number: data.number,
            complement: data.complement,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            cep: data.cep,
          }
        : undefined,
    };

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      const err = await res.json();
      alert(err.error ?? "Erro ao cadastrar. Tente novamente.");
    }
  };

  // ── Navegação entre etapas ─────────────────────────────────────────────────

  const nextStep = async () => {
    const fields: (keyof FormData)[][] = [
      ["name","email","whatsapp","organization","category"],
      ["boarding_who","boarding_offers","boarding_seeks","boarding_dream"],
      ["consent_basic"],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep((s) => s + 1);
  };

  // ── Sucesso ────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
          <h2 className="text-2xl font-bold text-hangar-blue mb-2">Bem-vindo ao Hangar!</h2>
          <p className="text-gray-500 mb-6">
            Seu Cartão de Bordo foi registrado. O guardião entrará em contato para o onboarding.
          </p>
          <Button onClick={() => { setSubmitted(false); setStep(1); }} variant="secondary">
            Novo cadastro
          </Button>
        </div>
      </div>
    );
  }

  // ── Formulário ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-hangar-blue mb-6">
            <ArrowLeft size={15} /> Início
          </Link>
          <div className="flex items-center gap-4">
            <HangarLogo size={52} />
            <div>
              <h1 className="text-xl font-bold text-hangar-blue">Cartão de Bordo</h1>
              <p className="text-gray-400 text-sm">Ecossistema de Inovação de SJP</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["Identificação","Cartão de Bordo","Consentimento"].map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  step > i + 1
                    ? "bg-green-500 text-white"
                    : step === i + 1
                    ? "bg-hangar-blue text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`ml-2 text-xs hidden sm:block ${step === i + 1 ? "font-semibold text-hangar-blue" : "text-gray-400"}`}>
                {label}
              </span>
              {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

            {/* ── ETAPA 1: Identificação ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4">Dados de identificação</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nome completo" {...register("name")} error={errors.name?.message} required />
                  <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message} required />
                  <Input label="WhatsApp" placeholder="(41) 99999-9999" {...register("whatsapp")} error={errors.whatsapp?.message} required />
                  <Input label="LinkedIn" placeholder="https://linkedin.com/in/..." {...register("linkedin")} error={errors.linkedin?.message} />
                  <Input label="Instagram" placeholder="@seuperfil" {...register("instagram")} error={errors.instagram?.message} />
                  <Input label="Organização" {...register("organization")} error={errors.organization?.message} required />
                  <Input label="CNPJ" placeholder="00.000.000/0001-00" {...register("cnpj")} />
                </div>

                <Select
                  label="Categoria"
                  {...register("category")}
                  error={errors.category?.message}
                  required
                  placeholder="Selecione..."
                  options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                />

                {/* Busca de CNAE */}
                <div className="flex flex-col gap-1" ref={cnaeRef}>
                  <label className="text-sm font-medium text-gray-700">
                    CNAEs principais <span className="text-gray-400 font-normal">(até 3)</span>
                  </label>
                  <div className="relative">
                    <input
                      value={cnaeQuery}
                      onChange={(e) => handleCnaeSearch(e.target.value)}
                      placeholder="Buscar por código ou atividade..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-hangar-blue focus:ring-2 focus:ring-hangar-blue/20 outline-none"
                    />
                    {cnaeSearching && (
                      <p className="text-xs text-gray-400 mt-1">Buscando...</p>
                    )}
                    {cnaeOptions.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {cnaeOptions.map((c) => (
                          <li
                            key={c.code}
                            onClick={() => addCnae(c)}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-hangar-blue hover:text-white"
                          >
                            <span className="font-mono text-xs mr-2">{c.code}</span>
                            {c.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {selectedCnaes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCnaes.map((c) => (
                        <span key={c.code} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                          <span className="font-mono">{c.code}</span>
                          <button type="button" onClick={() => removeCnae(c.code)} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interesses */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Interesses temáticos <span className="text-gray-400 font-normal">(até 3)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${
                          watchInterests.includes(tag)
                            ? "bg-hangar-orange text-white border-hangar-orange"
                            : "border-gray-300 text-gray-600 hover:border-hangar-orange"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ETAPA 2: Cartão de Bordo ── */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-1">Cartão de Bordo</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Estas informações são usadas para conectar você com outros membros do ecossistema.
                </p>
                <Textarea
                  label="Quem sou"
                  placeholder="Me apresento como..."
                  {...register("boarding_who")}
                  error={errors.boarding_who?.message}
                  required
                />
                <Textarea
                  label="O que ofereço ao ecossistema"
                  placeholder="Ofereço conhecimento em, acesso a, capacidade de..."
                  {...register("boarding_offers")}
                  error={errors.boarding_offers?.message}
                  required
                />
                <Textarea
                  label="O que busco no ecossistema"
                  placeholder="Busco parceiros para, acesso a, mentoria em..."
                  {...register("boarding_seeks")}
                  error={errors.boarding_seeks?.message}
                  required
                />
                <Textarea
                  label="Conexão mais esperada"
                  placeholder="Minha conexão dos sonhos seria com alguém que..."
                  {...register("boarding_dream")}
                  error={errors.boarding_dream?.message}
                  required
                />
              </div>
            )}

            {/* ── ETAPA 3: Consentimento LGPD ── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-semibold text-gray-800 mb-1">Privacidade e Consentimento</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Nos termos da Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018), precisamos do seu consentimento para tratamento dos dados. O controlador é a <strong>Aciap-SJP</strong>.
                </p>

                {/* Consentimento básico — obrigatório */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" {...register("consent_basic")} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Dados de contato e identificação <span className="text-red-500">*</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Nome, e-mail, WhatsApp e organização — necessários para participar do HangarSJP.
                    </p>
                  </div>
                </label>
                {errors.consent_basic && (
                  <p className="text-xs text-red-600 -mt-3">{errors.consent_basic.message}</p>
                )}

                {/* CPF — opcional */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" {...register("consent_cpf")} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">CPF (opcional)</p>
                    <p className="text-xs text-gray-500">
                      Armazenado com criptografia AES-256. Nunca aparece em relatórios.
                    </p>
                  </div>
                </label>
                {watchConsentCpf && (
                  <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    {...register("cpf")}
                    error={errors.cpf?.message}
                    className="ml-8"
                  />
                )}

                {/* Perfil público — opcional */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" {...register("consent_public_profile")} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Perfil público (opcional)</p>
                    <p className="text-xs text-gray-500">
                      Permite que outros membros vejam seu Cartão de Bordo para conexões.
                    </p>
                  </div>
                </label>

                {/* Endereço — opcional */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" {...register("consent_address")} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Endereço (opcional)</p>
                    <p className="text-xs text-gray-500">
                      Usado apenas para relatórios geográficos do ecossistema por bairro/cidade.
                    </p>
                  </div>
                </label>

                {watchConsentAddress && (
                  <div className="ml-8 space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex gap-3 items-end">
                      <Input
                        label="CEP"
                        placeholder="00000-000"
                        {...register("cep")}
                        error={errors.cep?.message}
                        onBlur={(e) => handleCepBlur(e.target.value)}
                        className="w-36"
                      />
                      {cepLoading && <p className="text-xs text-gray-400 mb-2">Buscando...</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <Input label="Logradouro" {...register("street")} error={errors.street?.message} />
                      </div>
                      <Input label="Número" {...register("number")} error={errors.number?.message} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Complemento" {...register("complement")} />
                      <Input label="Bairro" {...register("neighborhood")} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Cidade" {...register("city")} />
                      <Input label="Estado" {...register("state")} className="w-full" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Botões de navegação ── */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Voltar
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button type="button" onClick={nextStep}>
                Continuar
              </Button>
            ) : (
              <Button type="submit" loading={loading}>
                Confirmar cadastro
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
