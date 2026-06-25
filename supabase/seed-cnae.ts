/**
 * Sincroniza a tabela cnae_ref com todos os dados da API IBGE Concla.
 * Execute uma vez no setup e depois mensalmente:
 *   npx tsx supabase/seed-cnae.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IbgeCnae {
  id: string;
  descricao: string;
  classe: { id: string; descricao: string };
  divisao: { id: string; descricao: string };
  secao: { id: string; descricao: string };
}

async function main() {
  console.log("Buscando subclasses CNAE 2.3 do IBGE...");
  const res = await fetch("https://servicodados.ibge.gov.br/api/v2/cnae/subclasses");
  if (!res.ok) throw new Error(`IBGE retornou ${res.status}`);

  const data: IbgeCnae[] = await res.json();
  console.log(`${data.length} subclasses encontradas. Inserindo no Supabase...`);

  const rows = data.map((item) => ({
    code: item.id,
    description: item.descricao,
    section_code: item.secao?.id ?? null,
    section_desc: item.secao?.descricao ?? null,
    division: item.divisao?.id ?? null,
    ibge_source_url: `https://cnae.ibge.gov.br/component/k2/item/${item.id}`,
    synced_at: new Date().toISOString().split("T")[0],
  }));

  // Upsert em lotes de 200 para não exceder o payload
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("cnae_ref")
      .upsert(batch, { onConflict: "code" });

    if (error) throw new Error(`Erro no lote ${i / batchSize + 1}: ${error.message}`);
    console.log(`  Lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)} inserido.`);
  }

  console.log("Sincronização concluída!");
}

main().catch((e) => { console.error(e); process.exit(1); });
