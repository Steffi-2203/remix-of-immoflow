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

      <g transform="translate(80,80)">
        <rect x="0" y="40" width="48" height="140" fill="#0F6BFF" rx="4" />
        <rect x="60" y="20" width="36" height="160" fill="#0B4ED6" rx="3" />
        <rect x="108" y="60" width="28" height="120" fill="#0F6BFF" rx="3" />
        <g fill="#FFFFFF" opacity="0.9">
          <rect x="8" y="52" width="10" height="12" rx="1" />
          <rect x="8" y="72" width="10" height="12" rx="1" />
          <rect x="68" y="32" width="8" height="10" rx="1" />
          <rect x="68" y="52" width="8" height="10" rx="1" />
          <rect x="116" y="72" width="6" height="8" rx="1" />
        </g>
      </g>

      <g transform="translate(360,120)">
        <polygon points="0,40 40,0 80,40" fill="currentColor" opacity="0.9" />
        <rect x="8" y="40" width="64" height="56" fill="#0F6BFF" rx="4" />
        <rect x="28" y="60" width="16" height="36" fill="#0B4ED6" rx="2" />
      </g>

      <g stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" opacity="0.95">
        <path d="M140 220 L220 160" strokeDasharray="0 12" />
        <path d="M170 240 L260 180" strokeDasharray="0 12" opacity="0.85" />
        <path d="M200 260 L300 200" strokeDasharray="0 12" opacity="0.7" />
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
      viewBox="40 60 260 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ImmoFlowMe"
      className={className}
      {...props}
    >
      <g transform="translate(80,80)">
        <rect x="0" y="40" width="48" height="140" fill="#0F6BFF" rx="4" />
        <rect x="60" y="20" width="36" height="160" fill="#0B4ED6" rx="3" />
        <rect x="108" y="60" width="28" height="120" fill="#0F6BFF" rx="3" />
        <g fill="#FFFFFF" opacity="0.9">
          <rect x="8" y="52" width="10" height="12" rx="1" />
          <rect x="8" y="72" width="10" height="12" rx="1" />
          <rect x="68" y="32" width="8" height="10" rx="1" />
          <rect x="68" y="52" width="8" height="10" rx="1" />
          <rect x="116" y="72" width="6" height="8" rx="1" />
        </g>
      </g>

      <g stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" opacity="0.95">
        <path d="M140 220 L220 160" strokeDasharray="0 12" />
        <path d="M170 240 L260 180" strokeDasharray="0 12" opacity="0.85" />
      </g>
    </svg>
  );
}
