import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed",
        {
          primary: "bg-hangar-blue text-white hover:bg-hangar-blue/90 focus:ring-hangar-blue",
          secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300",
          danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
          ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
        }[variant],
        {
          sm: "px-3 py-1.5 text-xs gap-1.5",
          md: "px-4 py-2 text-sm gap-2",
          lg: "px-6 py-3 text-base gap-2",
        }[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
