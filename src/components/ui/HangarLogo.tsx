interface HangarLogoProps {
  size?: number;
  className?: string;
}

export function HangarLogo({ size = 48, className = "" }: HangarLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fundo preto */}
      <rect width="100" height="100" fill="#111111" />
      {/* Retângulo coral com recorte triangular no canto superior esquerdo */}
      <polygon points="28,12 88,12 88,88 12,88 12,36" fill="#E8503A" />
      {/* Texto Hangar */}
      <text x="16" y="54" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="22" fill="#111111" letterSpacing="-0.5">Han</text>
      <text x="16" y="74" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="22" fill="#111111" letterSpacing="-0.5">gar</text>
      {/* Texto SJP */}
      <text x="55" y="86" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="#111111" letterSpacing="0.5">SJP</text>
    </svg>
  );
}

export function HangarLogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <HangarLogo size={40} />
      <div>
        <p className="text-xs text-gray-500 leading-none">Ecossistema de Inovação</p>
        <p className="text-xs text-gray-400 leading-none">São José dos Pinhais</p>
      </div>
    </div>
  );
}
