import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { SECRET_ENV_PREFIX } from '../config/values.js';
import { OUTPUT_ROOT } from '../runs/dirs.js';
import { writeJsonAtomic } from '../runs/files.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { registerSecret } from '../shared/redact.js';

const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Plugins and extensions start the server in their own install folder, never the user's project.
export const IN_PLUGIN_ENV = 'CURSORCAM_MCP_IN_PLUGIN';
const DEFAULT_STEPS_NAME = 'steps';

type FlagValue = string | number | boolean | readonly string[] | undefined;

const isList = (value: FlagValue): value is readonly string[] => Array.isArray(value);

export function flags(options: Readonly<Record<string, FlagValue>>): string[] {
  return Object.entries(options).flatMap(([flag, value]) => {
    if (value === undefined || value === false) return [];
    if (value === true) return [flag];
    if (isList(value)) return value.length > 0 ? [flag, ...value] : [];
    return [flag, String(value)];
  });
}

export function secretEnv(secrets: Readonly<Record<string, string>> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(secrets)) {
    if (!SECRET_NAME.test(name)) {
      throw new CursorCamError(`"${name}" is not a valid secret name.`, {
        exitCode: ExitCode.BadInput,
        hint: 'Use letters, digits and underscores, like PASSWORD for $secret:PASSWORD.',
      });
    }
    registerSecret(value);
    env[`${SECRET_ENV_PREFIX}${name.toUpperCase()}`] = value;
  }
  return env;
}

export function workDir(
  workspace: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (workspace) return workspace;
  return env[IN_PLUGIN_ENV] ? homedir() : process.cwd();
}

// Apps like Claude Desktop start servers in a folder the user cannot write to, such as /.
export async function outDir(cwd: string, out: string | undefined): Promise<string> {
  if (out) return resolve(cwd, out);
  const writable = await access(cwd, constants.W_OK).then(
    () => true,
    () => false,
  );
  return writable ? join(cwd, OUTPUT_ROOT) : join(homedir(), OUTPUT_ROOT);
}

export function styleArg(style: string | object | undefined): string | undefined {
  return typeof style === 'object' ? JSON.stringify(style) : style;
}

export async function stepsFile(steps: string | object, cwd: string, dir: string): Promise<string> {
  if (typeof steps === 'string') return resolve(cwd, steps);
  const name = 'name' in steps && typeof steps.name === 'string' ? fileName(steps.name) : '';
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${name || DEFAULT_STEPS_NAME}.json`);
  await writeJsonAtomic(file, steps);
  return file;
}

function fileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
