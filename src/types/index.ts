export type MemberCategory =
  | "empresa"
  | "startup"
  | "institucional"
  | "universidade"
  | "poder_publico"
  | "habitat"
  | "lideranca";

export type MemberStatus = "ativo" | "irregular" | "licenciado" | "excluido";

export type PointCategory =
  | "presenca"
  | "conteudo"
  | "articulacao"
  | "governanca"
  | "operacao";

export type RoleSpecial =
  | "torre_controle"
  | "mecanico_solo"
  | "controlador_rota"
  | null;

export interface CnaeItem {
  code: string;
  description: string;
  section_code: string;
  section_desc: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  linkedin?: string;
  instagram?: string;
  organization: string;
  cnpj?: string;
  category: MemberCategory;
  cnaes: CnaeItem[];
  address?: Address;
  interests: string[];
  referred_by?: string;
  level: number;
  points: number;
  role_special: RoleSpecial;
  onboarding_date?: string;
  status: MemberStatus;
  created_at: string;
  updated_at?: string;
  // Cartão de Bordo (boarding table join)
  boarding_who?: string;
  boarding_offers?: string;
  boarding_seeks?: string;
  boarding_dream?: string;
}

export interface MemberTask {
  id: string;
  member_id: string;
  assigned_by?: string;
  title: string;
  description?: string;
  category?: PointCategory;
  points: number;
  due_date?: string;
  requested_at?: string;
  completed_at?: string;
  created_at: string;
}

// SVG inline do logo HangarSJP para uso em impressões
export const HANGAR_LOGO_SVG = `<svg width="56" height="56" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#111111"/>
  <polygon points="28,12 88,12 88,88 12,88 12,36" fill="#E8503A"/>
  <text x="16" y="54" font-family="Arial Black, Arial" font-weight="900" font-size="22" fill="#111111">Han</text>
  <text x="16" y="74" font-family="Arial Black, Arial" font-weight="900" font-size="22" fill="#111111">gar</text>
  <text x="55" y="86" font-family="Arial Black, Arial" font-weight="900" font-size="13" fill="#111111">SJP</text>
</svg>`;

export const POINT_ACTIVITIES: { category: PointCategory; title: string; points: number }[] = [
  { category: "presenca", title: "Reunião ordinária", points: 5 },
  { category: "presenca", title: "Onboarding", points: 10 },
  { category: "presenca", title: "Evento do ecossistema", points: 8 },
  { category: "presenca", title: "Reunião de câmara/GT", points: 5 },
  { category: "presenca", title: "Justificar ausência", points: 2 },
  { category: "conteudo", title: "Palestra em evento", points: 15 },
  { category: "conteudo", title: "Post marcando @hangarsjp", points: 5 },
  { category: "conteudo", title: "Compartilhar oportunidade", points: 3 },
  { category: "conteudo", title: "Produzir conteúdo (artigo, vídeo)", points: 12 },
  { category: "articulacao", title: "Indicar membro aprovado", points: 10 },
  { category: "articulacao", title: "Parceria concretizada", points: 20 },
  { category: "articulacao", title: "Conectar startup a recurso/investimento", points: 25 },
  { category: "articulacao", title: "Trazer palestrante externo", points: 15 },
  { category: "articulacao", title: "Viabilizar apoio institucional", points: 20 },
  { category: "governanca", title: "Mesa Diretora (por mês)", points: 8 },
  { category: "governanca", title: "Coordenar câmara/GT (por mês)", points: 6 },
  { category: "governanca", title: "Padrinho ativo de novo membro", points: 10 },
  { category: "operacao", title: "Fazer ata/registro de reunião", points: 5 },
  { category: "operacao", title: "Organizar/apoiar evento", points: 12 },
];

export interface MemberConsent {
  id: string;
  member_id: string;
  consent_basic: boolean;
  consent_cpf: boolean;
  consent_public_profile: boolean;
  consent_address: boolean;
  controller: string;
  privacy_policy_version: string;
  ip_address?: string;
  user_agent?: string;
  accepted_at: string;
  revoked_at?: string;
  revocation_reason?: string;
}

export interface Boarding {
  id: string;
  member_id: string;
  who: string;
  offers: string;
  seeks: string;
  dream_connection: string;
  completed_at: string;
  points_granted: number;
  version: number;
}

export interface PointEvent {
  id: string;
  member_id: string;
  points: number;
  category: PointCategory;
  reason?: string;
  reference_id?: string;
  granted_by?: string;
  created_at: string;
}

export const LEVEL_NAMES: Record<number, string> = {
  0: "Passageiro em espera",
  1: "Passageiro embarcado",
  2: "Tripulação de cabine",
  3: "Copiloto",
  4: "Comandante",
  5: "Torre de Controle",
};

export const LEVEL_POINTS: Record<number, number> = {
  0: 0,
  1: 15,
  2: 50,
  3: 120,
  4: Infinity,
  5: Infinity,
};

export const CATEGORY_LABELS: Record<MemberCategory, string> = {
  empresa: "Empresa",
  startup: "Startup",
  institucional: "Institucional",
  universidade: "Universidade",
  poder_publico: "Poder Público",
  habitat: "Habitat de Inovação",
  lideranca: "Liderança",
};

export const INTEREST_OPTIONS = [
  "inovação",
  "tecnologia",
  "empreendedorismo",
  "investimento",
  "educação",
  "saúde",
  "agronegócio",
  "indústria 4.0",
  "sustentabilidade",
  "govtech",
  "fintech",
  "logística",
  "varejo",
  "turismo",
  "cultura",
];
