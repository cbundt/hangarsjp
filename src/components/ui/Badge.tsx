import { clsx } from "clsx";

const variants = {
  level0: "bg-gray-100 text-gray-600",
  level1: "bg-blue-100 text-blue-700",
  level2: "bg-indigo-100 text-indigo-700",
  level3: "bg-purple-100 text-purple-700",
  level4: "bg-amber-100 text-amber-700",
  level5: "bg-sky-100 text-sky-800 ring-1 ring-sky-300",
  ativo: "bg-green-100 text-green-700",
  irregular: "bg-red-100 text-red-700",
  licenciado: "bg-yellow-100 text-yellow-700",
  excluido: "bg-gray-100 text-gray-500",
  torre_controle: "bg-amber-200 text-amber-800",
  mecanico_solo: "bg-cyan-100 text-cyan-700",
  controlador_rota: "bg-violet-100 text-violet-700",
};

interface BadgeProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "ativo", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
