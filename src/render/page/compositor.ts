import type { Box, DrawFrame, JobDialog, RenderJob } from '../job.js';

type Context = OffscreenCanvasRenderingContext2D;

const SHADOW_BLUR = 0.045;
const SHADOW_OFFSET = 0.018;
const BAR_COLOR = '#eceef1';
const BAR_LINE_COLOR = '#d5d8dd';
const DOT_COLORS = ['#ff5f57', '#febc2e', '#28c840'] as const;
const DOT_RADIUS = 0.16;
const DOT_GAP = 0.5;
const URL_PILL_COLOR = '#ffffff';
const URL_TEXT_COLOR = '#4b5563';
const URL_FONT = 0.36;
const URL_PILL_WIDTH = 0.5;
const URL_PILL_HEIGHT = 0.62;
const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CURSOR_CSS_HEIGHT = 22;
const PRESSED_SCALE = 0.86;
const RIPPLE_START_CSS = 6;
const RIPPLE_GROWTH_CSS = 26;
const RIPPLE_ALPHA = 0.32;
const RIPPLE_COLOR = '59, 130, 246';
const TOUCH_RADIUS_CSS = 18;
const TOUCH_COLOR = 'rgba(17, 24, 39, 0.32)';
const TOUCH_RING = 'rgba(255, 255, 255, 0.85)';
const CARD_WIDTH = 0.64;
const CARD_PADDING = 0.022;
const CARD_RADIUS = 0.012;
const CARD_FONT = 0.017;
const CARD_MAX_LINES = 4;
const CARD_LINE_HEIGHT = 1.4;
const CARD_SHADOW_BLUR = 0.03;
const CARD_DIM_COLOR = 'rgba(15, 23, 42, 0.28)';
const CARD_SHADOW_COLOR = 'rgba(0, 0, 0, 0.3)';
const CARD_TITLE_COLOR = '#111827';
const CARD_TEXT_COLOR = '#374151';
const CARD_BUTTON_COLOR = '#2563eb';
const BUTTON_WIDTH_EM = 4;
const BUTTON_HEIGHT_EM = 1.8;
const BUTTON_ROUNDNESS = 0.25;
const MESSAGE_TOP_LINES = 1.2;
const URL_TEXT_ROOM = 0.9;
const TOUCH_RING_WIDTH_CSS = 1.5;
const ARROW_FILL = '#000000';
const ARROW_OUTLINE = '#ffffff';
const ARROW_OUTLINE_WIDTH = 1.2;
const ARROW_SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)';
const ARROW_SHADOW_BLUR = 2;
const ARROW_SHADOW_OFFSET = 0.6;
const FALLBACK_BACKGROUND = '#111827';
const SHADOW_FILL = '#000000';
const CARD_COLOR = '#ffffff';
const BUTTON_TEXT_COLOR = '#ffffff';
const DEGREES_TO_RADIANS = Math.PI / 180;
const DIALOG_TITLES: Readonly<Record<string, string>> = {
  alert: 'Alert',
  confirm: 'Confirm',
  prompt: 'Prompt',
  beforeunload: 'Leave this page?',
};
const ARROW_PATH = [
  [0, 0],
  [0, 17],
  [4.2, 13.2],
  [7, 19.6],
  [9.6, 18.5],
  [6.9, 12.3],
  [12.2, 12.3],
] as const;
const ARROW_HEIGHT = 19.6;

export class Compositor {
  readonly canvas: OffscreenCanvas;
  readonly #context: Context;
  readonly #base: OffscreenCanvas;
  readonly #job: RenderJob;

  constructor(job: RenderJob, backgroundImage: ImageBitmap | undefined, readable = false) {
    this.#job = job;
    const { width, height } = job.output;
    this.canvas = new OffscreenCanvas(width, height);
    this.#context = context2d(this.canvas, readable);
    this.#base = new OffscreenCanvas(width, height);
    drawBase(context2d(this.#base), job, backgroundImage);
  }

  pixels(): Uint8ClampedArray {
    return this.#context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
  }

  draw(frame: DrawFrame, source: ImageBitmap): void {
    const context = this.#context;
    const { layout, source: info } = this.#job;
    const [cropX, cropY, cropWidth, cropHeight] = frame.crop;
    const { content } = layout;
    const scale = content.width / cropWidth;

    context.drawImage(this.#base, 0, 0);
    context.save();
    roundedPath(
      context,
      content,
      layout.bar ? [0, 0, layout.radius, layout.radius] : layout.radius,
    );
    context.clip();
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      source,
      cropX * info.scale,
      cropY * info.scale,
      cropWidth * info.scale,
      cropHeight * info.scale,
      content.x,
      content.y,
      content.width,
      content.height,
    );
    const toScreen = (x: number, y: number) => ({
      x: content.x + (x - cropX) * scale,
      y: content.y + (y - cropY) * scale,
    });
    for (const [x, y, progress] of frame.ripples ?? [])
      drawRipple(context, toScreen(x, y), progress, scale);
    const cursor = this.#job.cursor;
    if (cursor && frame.cursor) {
      const [x, y, pressed] = frame.cursor;
      const point = toScreen(x, y);
      if (cursor.kind === 'touch') drawTouch(context, point, scale * cursor.size);
      else drawArrow(context, point, scale * cursor.size * (pressed ? PRESSED_SCALE : 1));
    }
    context.restore();

    if (layout.bar && frame.url !== undefined)
      drawUrl(context, layout.bar, this.#job.urls[frame.url] ?? '');
    const dialog = frame.dialog === undefined ? undefined : this.#job.dialogs[frame.dialog];
    if (dialog) drawDialog(context, layout.content, dialog, this.#job.output.height);
  }
}

function context2d(canvas: OffscreenCanvas, readable = false): Context {
  const context = canvas.getContext('2d', { willReadFrequently: readable });
  if (!context) throw new Error('This browser cannot draw on a canvas.');
  return context;
}

function drawBase(context: Context, job: RenderJob, image: ImageBitmap | undefined): void {
  const { width, height } = job.output;
  const { layout } = job;
  const background = job.background;
  if (image) {
    const cover = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * cover;
    const drawHeight = image.height * cover;
    context.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  } else if (background.kind === 'gradient') {
    const radians = background.angle * DEGREES_TO_RADIANS;
    const reach = (Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))) / 2;
    const dx = Math.sin(radians) * reach;
    const dy = -Math.cos(radians) * reach;
    const gradient = context.createLinearGradient(
      width / 2 - dx,
      height / 2 - dy,
      width / 2 + dx,
      height / 2 + dy,
    );
    gradient.addColorStop(0, background.from);
    gradient.addColorStop(1, background.to);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  } else {
    context.fillStyle = background.kind === 'solid' ? background.color : FALLBACK_BACKGROUND;
    context.fillRect(0, 0, width, height);
  }

  if (layout.shadow > 0) {
    context.save();
    context.shadowColor = `rgba(0, 0, 0, ${layout.shadow})`;
    context.shadowBlur = height * SHADOW_BLUR;
    context.shadowOffsetY = height * SHADOW_OFFSET;
    context.fillStyle = SHADOW_FILL;
    roundedPath(context, layout.window, layout.radius);
    context.fill();
    context.restore();
  }

  const bar = layout.bar;
  if (!bar) return;
  context.save();
  roundedPath(context, bar, [layout.radius, layout.radius, 0, 0]);
  context.fillStyle = BAR_COLOR;
  context.fill();
  context.fillStyle = BAR_LINE_COLOR;
  context.fillRect(bar.x, bar.y + bar.height - 1, bar.width, 1);
  const dotRadius = bar.height * DOT_RADIUS;
  DOT_COLORS.forEach((color, index) => {
    context.beginPath();
    context.arc(
      bar.x + bar.height * (DOT_GAP + index * DOT_GAP) + dotRadius,
      bar.y + bar.height / 2,
      dotRadius,
      0,
      Math.PI * 2,
    );
    context.fillStyle = color;
    context.fill();
  });
  context.restore();
}

function drawUrl(context: Context, bar: Box, text: string): void {
  if (text === '') return;
  const pillWidth = bar.width * URL_PILL_WIDTH;
  const pillHeight = bar.height * URL_PILL_HEIGHT;
  const pill = {
    x: bar.x + (bar.width - pillWidth) / 2,
    y: bar.y + (bar.height - pillHeight) / 2,
    width: pillWidth,
    height: pillHeight,
  };
  context.save();
  roundedPath(context, pill, pillHeight / 2);
  context.fillStyle = URL_PILL_COLOR;
  context.fill();
  context.font = `${Math.round(bar.height * URL_FONT)}px ${FONT_FAMILY}`;
  context.fillStyle = URL_TEXT_COLOR;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(
    fitText(context, text, pillWidth * URL_TEXT_ROOM),
    pill.x + pillWidth / 2,
    pill.y + pillHeight / 2,
  );
  context.restore();
}

function drawRipple(
  context: Context,
  point: { x: number; y: number },
  progress: number,
  scale: number,
): void {
  const radius = (RIPPLE_START_CSS + RIPPLE_GROWTH_CSS * progress) * scale;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fillStyle = `rgba(${RIPPLE_COLOR}, ${RIPPLE_ALPHA * (1 - progress)})`;
  context.fill();
}

function drawTouch(context: Context, point: { x: number; y: number }, scale: number): void {
  context.beginPath();
  context.arc(point.x, point.y, TOUCH_RADIUS_CSS * scale, 0, Math.PI * 2);
  context.fillStyle = TOUCH_COLOR;
  context.fill();
  context.lineWidth = Math.max(1, scale * TOUCH_RING_WIDTH_CSS);
  context.strokeStyle = TOUCH_RING;
  context.stroke();
}

function drawArrow(context: Context, point: { x: number; y: number }, scale: number): void {
  const size = (CURSOR_CSS_HEIGHT / ARROW_HEIGHT) * scale;
  context.save();
  context.translate(point.x, point.y);
  context.scale(size, size);
  context.beginPath();
  for (const [index, [x, y]] of ARROW_PATH.entries()) {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.shadowColor = ARROW_SHADOW_COLOR;
  context.shadowBlur = ARROW_SHADOW_BLUR;
  context.shadowOffsetY = ARROW_SHADOW_OFFSET;
  context.fillStyle = ARROW_FILL;
  context.fill();
  context.shadowColor = 'transparent';
  context.lineJoin = 'round';
  context.lineWidth = ARROW_OUTLINE_WIDTH;
  context.strokeStyle = ARROW_OUTLINE;
  context.stroke();
  context.restore();
}

function drawDialog(context: Context, area: Box, dialog: JobDialog, height: number): void {
  const width = height * CARD_WIDTH;
  const padding = height * CARD_PADDING;
  const fontSize = Math.round(height * CARD_FONT);
  context.save();
  context.font = `${fontSize}px ${FONT_FAMILY}`;
  const lines = wrapText(context, dialog.message, width - 2 * padding).slice(0, CARD_MAX_LINES);
  const lineHeight = fontSize * CARD_LINE_HEIGHT;
  const buttonHeight = fontSize * BUTTON_HEIGHT_EM;
  const cardHeight = padding * 3 + lineHeight * (lines.length + 1) + buttonHeight;
  const card = {
    x: area.x + (area.width - width) / 2,
    y: area.y + (area.height - cardHeight) / 2,
    width,
    height: cardHeight,
  };
  context.fillStyle = CARD_DIM_COLOR;
  context.fillRect(area.x, area.y, area.width, area.height);
  context.shadowColor = CARD_SHADOW_COLOR;
  context.shadowBlur = height * CARD_SHADOW_BLUR;
  roundedPath(context, card, height * CARD_RADIUS);
  context.fillStyle = CARD_COLOR;
  context.fill();
  context.shadowColor = 'transparent';
  context.fillStyle = CARD_TITLE_COLOR;
  context.textBaseline = 'top';
  context.font = `600 ${fontSize}px ${FONT_FAMILY}`;
  context.fillText(DIALOG_TITLES[dialog.kind] ?? 'Message', card.x + padding, card.y + padding);
  context.font = `${fontSize}px ${FONT_FAMILY}`;
  context.fillStyle = CARD_TEXT_COLOR;
  lines.forEach((line, index) =>
    context.fillText(
      line,
      card.x + padding,
      card.y + padding + lineHeight * (index + MESSAGE_TOP_LINES),
    ),
  );
  const button = { width: fontSize * BUTTON_WIDTH_EM, height: buttonHeight };
  const buttonBox = {
    x: card.x + card.width - padding - button.width,
    y: card.y + card.height - padding - button.height,
    ...button,
  };
  roundedPath(context, buttonBox, button.height * BUTTON_ROUNDNESS);
  context.fillStyle = CARD_BUTTON_COLOR;
  context.fill();
  context.fillStyle = BUTTON_TEXT_COLOR;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('OK', buttonBox.x + button.width / 2, buttonBox.y + button.height / 2);
  context.restore();
}

function roundedPath(
  context: Context,
  box: Box,
  radius: number | [number, number, number, number],
): void {
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, radius);
}

function fitText(context: Context, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let shown = text;
  while (shown.length > 1 && context.measureText(`${shown}…`).width > maxWidth)
    shown = shown.slice(0, -1);
  return `${shown}…`;
}

function wrapText(context: Context, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || line === '') line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(fitText(context, line, maxWidth));
  return lines;
}
