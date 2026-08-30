/**
 * Original emblem inspired by command-style seals.
 * Not an official U.S. Government or DoD trademark; presentation branding only.
 */
export function CentcomSeal({
  size = 120,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const id = `centcom-seal-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="CENTCOM Threat COP command seal"
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e6a8" />
          <stop offset="45%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8a7014" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1e4d8c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#050a12" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="98" fill={`url(#${id}-gold)`} />
      <circle cx="100" cy="100" r="92" fill={`url(#${id}-blue)`} />
      <circle
        cx="100"
        cy="100"
        r="88"
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.5"
      />

      {/* Star points around rim */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const x = 100 + Math.cos(a) * 82;
        const y = 100 + Math.sin(a) * 82;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.8"
            fill={`url(#${id}-gold)`}
          />
        );
      })}

      {/* Inner field */}
      <circle cx="100" cy="100" r="68" fill={`url(#${id}-glow)`} />
      <circle
        cx="100"
        cy="100"
        r="66"
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1"
        opacity="0.7"
      />

      {/* Eagle-like chevron / sword motif (abstract, original) */}
      <path
        d="M100 42 L112 78 L148 78 L120 100 L132 140 L100 118 L68 140 L80 100 L52 78 L88 78 Z"
        fill={`url(#${id}-gold)`}
        opacity="0.95"
      />
      <path
        d="M100 58 L106 76 L126 76 L110 88 L116 110 L100 98 L84 110 L90 88 L74 76 L94 76 Z"
        fill="#0a1628"
      />

      {/* Globe hint */}
      <ellipse
        cx="100"
        cy="100"
        rx="38"
        ry="20"
        fill="none"
        stroke="#5b9bd5"
        strokeWidth="1"
        opacity="0.5"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="20"
        ry="38"
        fill="none"
        stroke="#5b9bd5"
        strokeWidth="1"
        opacity="0.35"
      />
      <line
        x1="62"
        y1="100"
        x2="138"
        y2="100"
        stroke="#5b9bd5"
        strokeWidth="0.8"
        opacity="0.4"
      />

      {/* Ribbon text path */}
      <path
        id={`${id}-top`}
        d="M 30 100 A 70 70 0 0 1 170 100"
        fill="none"
      />
      <path
        id={`${id}-bot`}
        d="M 170 100 A 70 70 0 0 1 30 100"
        fill="none"
      />
      <text
        fill={`url(#${id}-gold)`}
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
        letterSpacing="2"
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          UNITED STATES CENTRAL COMMAND
        </textPath>
      </text>
      <text
        fill={`url(#${id}-gold)`}
        fontSize="8"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
        letterSpacing="1.5"
      >
        <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
          THREAT COP · SENSITIVE
        </textPath>
      </text>
    </svg>
  );
}

export function DoDStyleBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
    >
      <CentcomSeal size={56} />
      <div className="text-left leading-tight">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#c9a227] font-mono">
          Department of Defense
        </p>
        <p className="text-sm font-bold text-[#f5e6a8] tracking-wide">
          U.S. CENTRAL COMMAND
        </p>
        <p className="text-[10px] text-[#8a9bb0] font-mono">
          AOR THREAT COMMON OPERATING PICTURE
        </p>
      </div>
    </div>
  );
}
