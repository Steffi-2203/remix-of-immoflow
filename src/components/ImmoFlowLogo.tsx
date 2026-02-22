interface ImmoFlowLogoProps {
  className?: string;
  showText?: boolean;
  'data-testid'?: string;
}

export function ImmoFlowLogo({ className = '', showText = true, ...props }: ImmoFlowLogoProps) {
  return (
    <svg
      viewBox="0 0 600 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ImmoFlowMe Logo"
      className={className}
      {...props}
    >
      <circle cx="300" cy="160" r="140" fill="none" stroke="#60A5FA" strokeWidth="2" opacity="0.12" />

      <rect x="40" y="260" width="520" height="8" fill="currentColor" opacity="0.08" />

      <g transform="translate(300,60)">
        <rect x="0" y="40" width="52" height="160" fill="#0B4ED6" rx="4" />
        <rect x="66" y="20" width="40" height="180" fill="#0F6BFF" rx="3" />
        <rect x="120" y="60" width="32" height="140" fill="#0B4ED6" rx="3" />
        <g fill="#FFFFFF" opacity="0.9">
          <rect x="10" y="56" width="10" height="12" rx="1" />
          <rect x="10" y="78" width="10" height="12" rx="1" />
          <rect x="10" y="100" width="10" height="12" rx="1" />
          <rect x="30" y="56" width="10" height="12" rx="1" />
          <rect x="30" y="78" width="10" height="12" rx="1" />
          <rect x="76" y="36" width="10" height="12" rx="1" />
          <rect x="76" y="58" width="10" height="12" rx="1" />
          <rect x="76" y="80" width="10" height="12" rx="1" />
          <rect x="76" y="102" width="10" height="12" rx="1" />
          <rect x="128" y="76" width="8" height="10" rx="1" />
          <rect x="128" y="96" width="8" height="10" rx="1" />
          <rect x="128" y="116" width="8" height="10" rx="1" />
        </g>
      </g>

      <g transform="translate(100,110)">
        <polygon points="0,56 56,0 112,56" fill="currentColor" opacity="0.9" />
        <rect x="10" y="56" width="92" height="94" fill="#0F6BFF" rx="4" />
        <rect x="38" y="90" width="24" height="60" fill="#0B4ED6" rx="2" />
        <g fill="#FFFFFF" opacity="0.85">
          <rect x="20" y="68" width="14" height="14" rx="1" />
          <rect x="78" y="68" width="14" height="14" rx="1" />
        </g>
      </g>

      <g stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" opacity="0.9">
        <path d="M220 230 L300 180" strokeDasharray="0 12" />
        <path d="M240 250 L330 200" strokeDasharray="0 12" opacity="0.8" />
        <path d="M260 268 L360 218" strokeDasharray="0 12" opacity="0.65" />
      </g>

      {showText && (
        <text
          x="300"
          y="340"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="28"
          textAnchor="middle"
          fill="currentColor"
        >
          ImmoFlowMe
        </text>
      )}
    </svg>
  );
}

interface ImmoFlowIconProps {
  className?: string;
  'data-testid'?: string;
}

export function ImmoFlowIcon({ className = '', ...props }: ImmoFlowIconProps) {
  return (
    <svg
      viewBox="0 0 320 260"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ImmoFlowMe"
      className={className}
      {...props}
    >
      <g transform="translate(160,10)">
        <rect x="0" y="30" width="42" height="130" fill="#0B4ED6" rx="3" />
        <rect x="52" y="10" width="34" height="150" fill="#0F6BFF" rx="3" />
        <rect x="96" y="45" width="26" height="115" fill="#0B4ED6" rx="3" />
        <g fill="#FFFFFF" opacity="0.9">
          <rect x="8" y="44" width="8" height="10" rx="1" />
          <rect x="8" y="62" width="8" height="10" rx="1" />
          <rect x="8" y="80" width="8" height="10" rx="1" />
          <rect x="24" y="44" width="8" height="10" rx="1" />
          <rect x="24" y="62" width="8" height="10" rx="1" />
          <rect x="60" y="24" width="8" height="10" rx="1" />
          <rect x="60" y="42" width="8" height="10" rx="1" />
          <rect x="60" y="60" width="8" height="10" rx="1" />
          <rect x="60" y="78" width="8" height="10" rx="1" />
          <rect x="102" y="58" width="7" height="9" rx="1" />
          <rect x="102" y="76" width="7" height="9" rx="1" />
        </g>
      </g>

      <g transform="translate(20,70)">
        <polygon points="0,48 48,0 96,48" fill="currentColor" opacity="0.9" />
        <rect x="8" y="48" width="80" height="82" fill="#0F6BFF" rx="3" />
        <rect x="32" y="78" width="20" height="52" fill="#0B4ED6" rx="2" />
        <g fill="#FFFFFF" opacity="0.85">
          <rect x="16" y="58" width="12" height="12" rx="1" />
          <rect x="68" y="58" width="12" height="12" rx="1" />
        </g>
      </g>

      <g stroke="#60A5FA" strokeWidth="5" strokeLinecap="round" opacity="0.9">
        <path d="M125 185 L170 150" strokeDasharray="0 10" />
        <path d="M140 200 L190 165" strokeDasharray="0 10" opacity="0.75" />
      </g>
    </svg>
  );
}
