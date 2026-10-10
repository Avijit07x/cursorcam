import { useId } from 'react';

export const LOGO_CORNERS = [
  'M10 23v-5a8 8 0 0 1 8-8h5',
  'M41 10h5a8 8 0 0 1 8 8v5',
  'M54 41v5a8 8 0 0 1-8 8h-5',
  'M23 54h-5a8 8 0 0 1-8-8v-5',
];
const CURSOR = 'M24 21v21l5.9-5 3.8 8.3 3.2-1.5-3.8-8.2h7.8Z';
const TIP = { x: 24, y: 21 };
const DOT = { x: 44.5, y: 21.5 };
const INK = '#1E1B4B';
const BLUE = '#4F46E5';
const RED = '#EF4444';
const WHITE = '#FFFFFF';
const FILL_BOX = '[transform-box:fill-box]';

interface CornersProps {
  readonly stroke: string;
  readonly width: number;
}

function Corners({ stroke, width }: CornersProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {LOGO_CORNERS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

interface StickerMarkProps {
  readonly className?: string;
}

export function StickerMark({ className }: StickerMarkProps) {
  const shadowId = `sticker-shadow-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <filter
          id={shadowId}
          x="-20%"
          y="-20%"
          width="140%"
          height="145%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor={INK} floodOpacity="0.24" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`}>
        <g transform="translate(32 32) rotate(-7) scale(0.88) translate(-32 -32)">
          <Corners stroke={WHITE} width={12} />
          <path d={CURSOR} fill={WHITE} stroke={WHITE} strokeWidth={10.5} strokeLinejoin="round" />
          <circle cx={DOT.x} cy={DOT.y} r={7.5} fill={WHITE} />
          <Corners stroke={INK} width={5.4} />
          <circle
            cx={TIP.x}
            cy={TIP.y}
            r={7}
            fill="none"
            stroke={BLUE}
            strokeWidth={2}
            className={`${FILL_BOX} origin-center opacity-0 motion-safe:animate-tap-ring`}
          />
          <path
            d={CURSOR}
            fill={BLUE}
            stroke={BLUE}
            strokeWidth={4.2}
            strokeLinejoin="round"
            className={`${FILL_BOX} origin-top-left motion-safe:animate-tap`}
          />
          <circle
            cx={DOT.x}
            cy={DOT.y}
            r={4}
            fill={RED}
            className={`${FILL_BOX} origin-center motion-safe:animate-logo-dot`}
          />
        </g>
      </g>
    </svg>
  );
}
