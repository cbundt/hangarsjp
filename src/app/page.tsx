import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HangarLogo } from "@/components/ui/HangarLogo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#111111] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="mb-8 flex justify-center">
          <HangarLogo size={120} />
        </div>
        <h2 className="text-white text-lg font-light mb-1 tracking-widest uppercase">Ecossistema de Inovação</h2>
        <p className="text-gray-500 text-sm mb-10 tracking-wider">São José dos Pinhais · PR</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/cadastro">
            <Button size="lg" className="bg-[#E8503A] hover:bg-[#d44432] border-0 text-white w-full sm:w-auto">
              Fazer cadastro
            </Button>
          </Link>
          <Link href="/guardian/membros">
            <Button size="lg" variant="secondary" className="border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800 w-full sm:w-auto">
              Painel do Guardião
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
