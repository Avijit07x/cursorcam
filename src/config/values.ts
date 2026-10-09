import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { registerSecret } from '../shared/redact.js';

export const SECRET_ENV_PREFIX = 'CURSORCAM_SECRET_';

const VALUE_REFERENCE = /^\$(secret|env):([A-Za-z_][A-Za-z0-9_]*)$/;

export interface TextValue {
  readonly text: string;
  readonly secret: boolean;
}

export function isValueReference(raw: string): boolean {
  return VALUE_REFERENCE.test(raw);
}

export function resolveText(raw: string, env: NodeJS.ProcessEnv = process.env): TextValue {
  const match = VALUE_REFERENCE.exec(raw);
  const kind = match?.[1];
  const name = match?.[2];
  if (!kind || !name) return { text: raw, secret: false };

  const variable = kind === 'secret' ? `${SECRET_ENV_PREFIX}${name.toUpperCase()}` : name;
  const value = env[variable];
  if (value === undefined || value === '') {
    throw new CursorCamError(`The steps use ${raw}, but ${variable} is not set.`, {
      exitCode: ExitCode.BadInput,
      hint:
        kind === 'secret'
          ? `Pass it to this one command, like ${variable}=… cursorcam run steps.json`
          : `Set ${variable} in your environment.`,
    });
  }
  registerSecret(value);
  return { text: value, secret: true };
}
