import { access, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { z } from 'zod';
import { messageOf, CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { DEFAULT_PALETTE, PALETTE_NAMES, SCENES } from './scenes.js';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const Color = z.string().regex(HEX_COLOR, 'must be a color like #1e293b');
const MAX_ZOOM_HOLD_MS = 5_000;

export const GRADIENTS = {
  aurora: ['#4f46e5', '#06b6d4'],
  sunset: ['#f97316', '#db2777'],
  ocean: ['#0ea5e9', '#1e3a8a'],
  forest: ['#10b981', '#064e3b'],
  midnight: ['#0f172a', '#334155'],
  paper: ['#f8fafc', '#cbd5e1'],
} as const satisfies Record<string, readonly [string, string]>;

type GradientName = keyof typeof GRADIENTS;
const GRADIENT_NAMES = Object.keys(GRADIENTS) as [GradientName, ...GradientName[]];
export const DEFAULT_GRADIENT_ANGLE = 135;

const Background = z.union([
  z.enum(GRADIENT_NAMES),
  Color,
  z.strictObject({ from: Color, to: Color, angle: z.number().default(DEFAULT_GRADIENT_ANGLE) }),
  z.strictObject({ image: z.string().min(1) }),
  z.strictObject({
    scene: z.enum(SCENES),
    colors: z.union([z.enum(PALETTE_NAMES), z.tuple([Color, Color])]).default(DEFAULT_PALETTE),
  }),
]);

export const StyleSchema = z.strictObject({
  format: z.enum(['landscape', 'square', 'vertical']).default('landscape'),
  background: Background.default('aurora'),
  padding: z.number().min(0).max(0.3).default(0.06),
  radius: z.number().min(0).max(48).default(14),
  shadow: z.number().min(0).max(1).default(0.45),
  browserBar: z.boolean().default(true),
  urlBar: z.union([z.string().max(120), z.literal(false)]).optional(),
  cursor: z
    .strictObject({
      show: z.boolean().default(true),
      size: z.number().min(0.5).max(3).default(1),
      ripple: z.boolean().default(true),
    })
    .prefault({}),
  zoom: z
    .strictObject({
      enabled: z.boolean().default(true),
      max: z.number().min(1.3).max(2.5).default(2),
      hold: z.int().min(0).max(MAX_ZOOM_HOLD_MS).default(0),
    })
    .prefault({}),
  dialogs: z.boolean().default(true),
  trimIdle: z.boolean().default(true),
});

export type Style = z.output<typeof StyleSchema>;
export type BackgroundSpec = Style['background'];

export function parseStyle(raw: unknown, source: string): Style {
  const parsed = StyleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CursorCamError(
      `The style from ${source} has errors:\n${z.prettifyError(parsed.error)}`,
      {
        exitCode: ExitCode.BadInput,
      },
    );
  }
  return parsed.data;
}

export async function loadStyle(option: string | undefined): Promise<Style> {
  if (option === undefined) return parseStyle({}, 'the defaults');
  const inline = option.trim().startsWith('{');
  let text = option;
  if (!inline) {
    try {
      text = await readFile(option, 'utf8');
    } catch (error) {
      throw new CursorCamError(`Could not read the style file ${option}.`, {
        exitCode: ExitCode.BadInput,
        cause: error,
      });
    }
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new CursorCamError(
      `The style ${inline ? 'option' : `file ${option}`} is not valid JSON.`,
      {
        exitCode: ExitCode.BadInput,
        hint: messageOf(error),
      },
    );
  }
  const style = parseStyle(raw, inline ? 'the --style option' : option);
  return inline
    ? withImagePath(style, process.cwd(), 'the current folder')
    : withImagePath(style, dirname(resolve(option)), 'the folder of the style file');
}

async function withImagePath(style: Style, baseDir: string, baseName: string): Promise<Style> {
  const background = style.background;
  if (typeof background !== 'object' || !('image' in background)) return style;
  const image = resolve(baseDir, background.image);
  if (!IMAGE_EXTENSIONS.has(extname(image).toLowerCase())) {
    throw new CursorCamError(`The background image ${image} is not a PNG, JPEG or WebP file.`, {
      exitCode: ExitCode.BadInput,
    });
  }
  const found = await access(image).then(
    () => true,
    () => false,
  );
  if (!found) {
    throw new CursorCamError(`Could not find the background image ${image}.`, {
      exitCode: ExitCode.BadInput,
      hint: `A relative path starts from ${baseName}.`,
    });
  }
  return { ...style, background: { image } };
}
