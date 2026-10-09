import { z } from 'zod';
import { LocatorSyntaxError, parseLocator } from './locator-syntax.js';

const MAX_STEP_PAUSE_MS = 60_000;
const DEFAULT_STEP_TIMEOUT_MS = 15_000;
const MIN_STEP_TIMEOUT_MS = 1_000;
const MAX_STEP_TIMEOUT_MS = 120_000;

const LocatorString = z
  .string()
  .trim()
  .min(1)
  .superRefine((value, context) => {
    try {
      parseLocator(value);
    } catch (error) {
      if (!(error instanceof LocatorSyntaxError)) throw error;
      context.addIssue({ code: 'custom', message: error.message });
    }
  });

const TargetObject = z.strictObject({
  find: LocatorString,
  nth: z.int().optional(),
  within: LocatorString.optional(),
  near: LocatorString.optional(),
  frame: z.string().trim().min(1).optional(),
  exact: z.boolean().optional(),
});

export const TargetSchema = z.union([LocatorString, TargetObject]);

const DialogSchema = z.union([
  z.enum(['accept', 'dismiss']),
  z.strictObject({ accept: z.boolean(), text: z.string().optional() }),
]);

const stepOptions = {
  zoom: z.union([z.number().min(1).max(3), z.literal(false)]).optional(),
  speed: z.number().min(0.25).max(4).optional(),
  pauseAfter: z.int().min(0).max(MAX_STEP_PAUSE_MS).optional(),
  dialog: DialogSchema.optional(),
};

const OneOrMore = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

const ScrollTo = z.strictObject({ to: z.union([z.enum(['top', 'bottom']), TargetSchema]) });
const ScrollBy = z.strictObject({ by: z.number().refine((value) => value !== 0) });

export const STEP_SCHEMAS = {
  goto: z.strictObject({ goto: z.string().trim().min(1), ...stepOptions }),
  click: z.strictObject({ click: TargetSchema, ...stepOptions }),
  dblclick: z.strictObject({ dblclick: TargetSchema, ...stepOptions }),
  hover: z.strictObject({ hover: TargetSchema, ...stepOptions }),
  type: z.strictObject({
    type: z.string(),
    into: TargetSchema,
    paste: z.boolean().optional(),
    clear: z.boolean().optional(),
    ...stepOptions,
  }),
  press: z.strictObject({ press: z.string().trim().min(1), ...stepOptions }),
  select: z.strictObject({
    select: OneOrMore,
    in: TargetSchema,
    showList: z.boolean().optional(),
    ...stepOptions,
  }),
  upload: z.strictObject({ upload: OneOrMore, into: TargetSchema, ...stepOptions }),
  scroll: z.strictObject({
    scroll: z.union([ScrollTo, ScrollBy]),
    in: TargetSchema.optional(),
    ...stepOptions,
  }),
  drag: z.strictObject({ drag: TargetSchema, to: TargetSchema, ...stepOptions }),
  waitFor: z.strictObject({
    waitFor: TargetSchema,
    state: z.enum(['visible', 'hidden']).optional(),
    ...stepOptions,
  }),
  pause: z.strictObject({ pause: z.int().min(0).max(MAX_STEP_PAUSE_MS), ...stepOptions }),
  ask: z.strictObject({ ask: z.string().trim().min(1), into: TargetSchema, ...stepOptions }),
} as const;

export type ActionName = keyof typeof STEP_SCHEMAS;
export const ACTION_NAMES = Object.keys(STEP_SCHEMAS) as ActionName[];

export type StepOf<Name extends ActionName> = z.output<(typeof STEP_SCHEMAS)[Name]>;
export type Step = { [Name in ActionName]: StepOf<Name> }[ActionName];
export type Target = z.output<typeof TargetSchema>;
export type DialogPolicy = z.output<typeof DialogSchema>;

const ORIGIN_PATTERN = /^https?:\/\/[^/]+$/;

export const StepsFileSchema = z.strictObject({
  $schema: z.string().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  url: z.url({ protocol: /^https?$/ }),
  viewport: z.enum(['desktop', 'phone']).default('desktop'),
  locale: z.string().min(2).default('en-US'),
  timezone: z.string().min(1).optional(),
  colorScheme: z.enum(['light', 'dark']).default('light'),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  permissions: z.array(z.string().min(1)).optional(),
  httpCredentials: z.strictObject({ username: z.string(), password: z.string() }).optional(),
  ignoreHTTPSErrors: z.boolean().optional(),
  allowOrigins: z
    .array(z.string().regex(ORIGIN_PATTERN, 'must be an origin like https://example.com'))
    .optional(),
  mask: z.array(z.string().trim().min(1)).optional(),
  timeout: z
    .int()
    .min(MIN_STEP_TIMEOUT_MS)
    .max(MAX_STEP_TIMEOUT_MS)
    .default(DEFAULT_STEP_TIMEOUT_MS),
  steps: z.array(z.unknown()).min(1),
});

export type StepsFileHeader = Omit<z.output<typeof StepsFileSchema>, 'steps'>;

export function stepsJsonSchema(): unknown {
  const steps = Object.values(STEP_SCHEMAS) as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]];
  const full = StepsFileSchema.extend({ steps: z.array(z.union(steps)).min(1) });
  return z.toJSONSchema(full, { io: 'input', unrepresentable: 'any' });
}
