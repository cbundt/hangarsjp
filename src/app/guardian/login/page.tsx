"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HangarLogo } from "@/components/ui/HangarLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lock } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/guardian/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("from") ?? "/guardian/membros");
    } else {
      setError("Senha incorreta. Tente novamente.");
    }
  };

  return (
    <main className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <HangarLogo size={72} />
          <h1 className="text-white text-lg font-semibold mt-4">Painel do Guardião</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={login} className="bg-white rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Lock size={16} />
            <span className="text-sm font-medium">Autenticação necessária</span>
          </div>

          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
