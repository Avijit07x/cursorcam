const INK = '#1E1B4B';
const BRAND = '#4F46E5';
const WHITE = '#fff';

interface ArtProps {
  readonly className: string;
}

export function MagnifierArt({ className, plus = false }: ArtProps & { readonly plus?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.3" fill={WHITE} stroke={INK} strokeWidth="2.4" />
      <path d="M15.4 15.4l4.6 4.6" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {plus ? (
        <path d="M10.5 8v5M8 10.5h5" stroke={BRAND} strokeWidth="2.2" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

interface LockArtProps extends ArtProps {
  readonly color: string;
  readonly keyhole?: string;
}

export function LockArt({ className, color, keyhole }: LockArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect x="5" y="10.5" width="14" height="10" rx="3" fill={color} />
      {keyhole ? <circle cx="12" cy="15.5" r="1.6" fill={keyhole} /> : null}
    </svg>
  );
}

export function HideArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12Z"
        fill={WHITE}
      />
      <circle cx="12" cy="12" r="3.2" fill={INK} />
      <path d="M4.5 19.5 19.5 4.5" stroke="#FB7185" strokeWidth="5" strokeLinecap="round" />
      <path d="M4.5 19.5 19.5 4.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function MoonArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="#FCD34D" />
    </svg>
  );
}

export function AddressArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="7" width="20" height="10" rx="5" fill={WHITE} />
      <circle cx="7" cy="12" r="2" fill={BRAND} />
      <path d="M11 12h7" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FastForwardArt({ className, color }: ArtProps & { readonly color: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M3.5 6.5v11l7.5-5.5ZM12 6.5v11l7.5-5.5Z"
        fill={color}
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BroomArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g transform="rotate(35 12 12)">
        <path d="M12 1.8V10.6" stroke={BRAND} strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M9.2 13.2h5.6l3.1 7.6c.2.6-.2 1.1-.8 1.2-3.1.5-6.1.5-9.2 0-.6-.1-1-.6-.8-1.2Z"
          fill="#FCD34D"
          stroke={INK}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M10.6 15.6 9.7 20.6M12 15.6v5.4M13.4 15.6l.9 5"
          stroke="#D97706"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <rect
          x="8.6"
          y="10.2"
          width="6.8"
          height="3.3"
          rx="1.4"
          fill="#FB7185"
          stroke={INK}
          strokeWidth="1.3"
        />
      </g>
      <path
        d="M17.6 18.2c.2 1 .7 1.5 1.7 1.7-1 .2-1.5.7-1.7 1.7-.2-1-.7-1.5-1.7-1.7 1-.2 1.5-.7 1.7-1.7Z"
        fill="#A5B4FC"
      />
      <circle cx="21" cy="16.6" r="0.9" fill="#C7D2FE" />
      <circle cx="14.6" cy="21.8" r="0.8" fill="#C7D2FE" />
    </svg>
  );
}
