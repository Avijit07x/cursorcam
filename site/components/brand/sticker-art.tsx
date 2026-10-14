const OUTLINE = {
  stroke: '#fff',
  strokeWidth: 3,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
} as const;
const INK = '#1E1B4B';
const BLUSH = '#FB7185';

export function HeartArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path
        d="M12 20.5C5.5 16.2 2.5 12.9 2.5 9.4 2.5 6.6 4.6 4.5 7.3 4.5c1.9 0 3.6 1 4.7 2.6 1.1-1.6 2.8-2.6 4.7-2.6 2.7 0 4.8 2.1 4.8 4.9 0 3.5-3 6.8-9.5 11.1Z"
        fill="#FB7185"
        {...OUTLINE}
      />
      <ellipse
        cx="7.4"
        cy="9"
        rx="1.1"
        ry="1.8"
        fill="#fff"
        opacity="0.55"
        transform="rotate(-30 7.4 9)"
      />
    </svg>
  );
}

export function StarArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path
        d="M12 2.6l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 16.9l-5.6 2.9 1.1-6.2L3 9.2l6.2-.9Z"
        fill="#FCD34D"
        {...OUTLINE}
      />
      <ellipse cx="10.3" cy="11.4" rx="0.75" ry="1.05" fill={INK} />
      <ellipse cx="13.7" cy="11.4" rx="0.75" ry="1.05" fill={INK} />
      <ellipse cx="9" cy="13.2" rx="1" ry="0.6" fill={BLUSH} opacity="0.6" />
      <ellipse cx="15" cy="13.2" rx="1" ry="0.6" fill={BLUSH} opacity="0.6" />
      <path
        d="M11.2 13.1q.8.7 1.6 0"
        fill="none"
        stroke={INK}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlayArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#4F46E5" {...OUTLINE} />
      <path
        d="M10 8.3v7.4l5.8-3.7Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path
        d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z"
        fill="#A78BFA"
        {...OUTLINE}
      />
    </svg>
  );
}

export function BuddyCursorArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path d="M6 3.5v15.2l4.2-3.6 2.7 6 2.3-1.1-2.7-5.9h5.6Z" fill="#4F46E5" {...OUTLINE} />
      <ellipse cx="8.2" cy="10.6" rx="0.8" ry="1.1" fill="#fff" />
      <ellipse cx="10.9" cy="11.8" rx="0.8" ry="1.1" fill="#fff" />
      <ellipse cx="7.6" cy="13.5" rx="0.8" ry="0.5" fill={BLUSH} opacity="0.8" />
    </svg>
  );
}

export function PhotoArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3.5" fill="#38BDF8" {...OUTLINE} />
      <circle cx="15.8" cy="9.6" r="1.8" fill="#FCD34D" />
      <path d="M4.5 17.5l4.5-5 3.5 3.5 2.2-2.2 4.8 3.7Z" fill="#fff" />
    </svg>
  );
}

export function SmileArt() {
  return (
    <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#4F46E5" {...OUTLINE} />
      <ellipse cx="12" cy="14.5" rx="1.7" ry="2.3" fill="#fff" />
      <ellipse cx="20" cy="14.5" rx="1.7" ry="2.3" fill="#fff" />
      <ellipse cx="9" cy="19" rx="2.1" ry="1.3" fill={BLUSH} opacity="0.85" />
      <ellipse cx="23" cy="19" rx="2.1" ry="1.3" fill={BLUSH} opacity="0.85" />
      <path
        d="M13.8 19.6q2.2 2 4.4 0"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PulseDot({ className }: { readonly className: string }) {
  return (
    <span className={`relative flex rounded-full ${className}`}>
      <span className="absolute inset-0 rounded-full bg-rec motion-safe:animate-pulse-ring" />
      <span className="relative size-full rounded-full bg-rec" />
    </span>
  );
}

export function RecArt() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold tracking-wide text-ink ring-2 ring-white">
      <PulseDot className="size-2.5" />
      REC
    </span>
  );
}

// The film-set drawings on the setup cards. Each one acts on hover of its card, the `group`.
const SET_OUTLINE = { ...OUTLINE, strokeWidth: 4 } as const;

export function LightArt() {
  return (
    <svg viewBox="0 0 110 110" className="size-full overflow-visible" aria-hidden="true">
      <path
        d="M38 40 104 96 58 108Z"
        fill="#FDE68A"
        className="opacity-60 group-hover:opacity-90 motion-safe:group-hover:animate-flicker"
      />
      <path d="M24 60 17 97M24 60l8 37" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <rect
        x="14"
        y="26"
        width="34"
        height="26"
        rx="8"
        transform="rotate(35 31 39)"
        fill="#4F46E5"
        {...SET_OUTLINE}
      />
      <circle cx="44" cy="50" r="5" fill="#FEF3C7" />
    </svg>
  );
}

export function CameraArt() {
  return (
    <svg viewBox="0 0 110 110" className="size-full overflow-visible" aria-hidden="true">
      <circle
        cx="78"
        cy="30"
        r="22"
        fill="#fff"
        className="origin-[78px_30px] opacity-0 motion-safe:group-hover:animate-flash"
      />
      <rect x="64" y="24" width="18" height="12" rx="4" fill={INK} />
      <rect x="14" y="34" width="82" height="56" rx="14" fill={BLUSH} {...SET_OUTLINE} />
      <circle cx="55" cy="62" r="18" fill={INK} stroke="#fff" strokeWidth={4} />
      <circle cx="55" cy="62" r="8" fill="#4F46E5" />
      <circle cx="51" cy="58" r="2.5" fill="#fff" />
      <circle cx="28" cy="46" r="4" fill="#FDE68A" />
    </svg>
  );
}

export function ClapperArt() {
  return (
    <svg viewBox="0 0 110 110" className="size-full overflow-visible" aria-hidden="true">
      <rect x="16" y="50" width="78" height="46" rx="8" fill={INK} {...SET_OUTLINE} />
      <path d="M28 66h54M28 78h38" stroke="#86EFAC" strokeWidth={4} strokeLinecap="round" />
      <g className="origin-[18px_46px] -rotate-18 ease-pop group-hover:rotate-0 motion-safe:transition-[rotate] motion-safe:duration-300">
        <rect
          x="16"
          y="34"
          width="78"
          height="14"
          rx="5"
          fill="#fff"
          stroke={INK}
          strokeWidth={3}
        />
        <path d="M30 35 24 47M46 35 40 47M62 35 56 47M78 35 72 47" stroke={INK} strokeWidth={5} />
      </g>
    </svg>
  );
}
