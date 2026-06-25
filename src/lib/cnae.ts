export interface CnaeOption {
  code: string;
  description: string;
  section_code: string;
  section_desc: string;
}

interface IbgeCnae {
  id: string;
  descricao: string;
  divisao: { id: string; descricao: string };
  secao: { id: string; descricao: string };
}

// Cache em memória — carrega uma vez por sessão (~1300 itens, ~200 KB)
let cache: CnaeOption[] | null = null;

async function getAll(): Promise<CnaeOption[]> {
  if (cache) return cache;
  try {
    const res = await fetch("https://servicodados.ibge.gov.br/api/v2/cnae/subclasses");
    if (!res.ok) return [];
    const data: IbgeCnae[] = await res.json();
    cache = data.map((item) => ({
      code: item.id,
      description: item.descricao,
      section_code: item.secao?.id ?? "",
      section_desc: item.secao?.descricao ?? "",
    }));
    return cache;
  } catch {
    return [];
  }
}

export async function searchCnae(query: string): Promise<CnaeOption[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const all = await getAll();
  return all
    .filter(
      (c) =>
        c.code.replace(/\D/g, "").startsWith(q.replace(/\D/g, "")) ||
        c.description.toLowerCase().includes(q)
    )
    .slice(0, 12);
}
