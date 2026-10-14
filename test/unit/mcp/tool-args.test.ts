import { mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  flags,
  IN_PLUGIN_ENV,
  outDir,
  secretEnv,
  stepsFile,
  styleArg,
  workDir,
} from '../../../src/mcp/tool-args.js';
import { clearSecrets, redact } from '../../../src/shared/redact.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('flags', () => {
  it('turns options into CLI flags and leaves out the unset ones', () => {
    expect(
      flags({
        '--phone': true,
        '--headed': false,
        '--filter': 'Save',
        '--limit': 5,
        '--mask': ['.email', '.name'],
        '--profile': undefined,
        '--until': undefined,
      }),
    ).toEqual(['--phone', '--filter', 'Save', '--limit', '5', '--mask', '.email', '.name']);
  });

  it('leaves out an empty list', () => {
    expect(flags({ '--mask': [] })).toEqual([]);
  });
});

describe('secretEnv', () => {
  afterEach(() => clearSecrets());

  it('maps each secret to its CURSORCAM_SECRET_ variable and hides its value', () => {
    expect(secretEnv({ password: 'hunter2', API_KEY: 'k-123' })).toEqual({
      CURSORCAM_SECRET_PASSWORD: 'hunter2',
      CURSORCAM_SECRET_API_KEY: 'k-123',
    });
    expect(redact('typed hunter2 and k-123')).toBe('typed ••• and •••');
  });

  it('is empty without secrets', () => {
    expect(secretEnv(undefined)).toEqual({});
  });

  it('refuses a name that cannot be an environment variable', () => {
    expect(() => secretEnv({ 'MY-PASS': 'x' })).toThrow('"MY-PASS" is not a valid secret name.');
  });
});

describe('styleArg', () => {
  it('passes a path or inline JSON through and writes an object as JSON', () => {
    expect(styleArg('style.json')).toBe('style.json');
    expect(styleArg({ zoom: { max: 1.4 } })).toBe('{"zoom":{"max":1.4}}');
    expect(styleArg(undefined)).toBeUndefined();
  });
});

describe('workDir', () => {
  it('uses the folder the client has open', () => {
    expect(workDir('/work/app', { [IN_PLUGIN_ENV]: '1' })).toBe('/work/app');
  });

  it('uses the server folder, or the home folder when a plugin started it', () => {
    expect(workDir(undefined, {})).toBe(process.cwd());
    expect(workDir(undefined, { [IN_PLUGIN_ENV]: '1' })).toBe(homedir());
  });
});

describe('outDir', () => {
  const dir = useTempDir('each');

  it('puts runs in cursorcam-output in the work folder', async () => {
    expect(await outDir(dir.path(), undefined)).toBe(join(dir.path(), 'cursorcam-output'));
  });

  it('resolves a folder the agent asks for against the work folder', async () => {
    expect(await outDir(dir.path(), 'videos')).toBe(join(dir.path(), 'videos'));
    expect(await outDir(dir.path(), '/tmp/videos')).toBe('/tmp/videos');
  });

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'uses cursorcam-output in the home folder when it cannot write in the work folder',
    async () => {
      const locked = join(dir.path(), 'locked');
      await mkdir(locked, { mode: 0o555 });

      expect(await outDir(locked, undefined)).toBe(join(homedir(), 'cursorcam-output'));
    },
  );
});

describe('stepsFile', () => {
  const dir = useTempDir('each');

  it('resolves a path against the work folder', async () => {
    expect(await stepsFile('flows/sign-up.json', '/work/app', dir.path())).toBe(
      join('/work/app', 'flows', 'sign-up.json'),
    );
  });

  it('saves inline steps under their name in the output folder', async () => {
    const steps = { name: 'Create an Issue!', url: 'http://localhost:3000', steps: [{ pause: 1 }] };

    const file = await stepsFile(steps, '/work/app', dir.path());

    expect(file).toBe(join(dir.path(), 'create-an-issue.json'));
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(steps);
  });

  it('falls back to steps.json without a usable name', async () => {
    const steps = { url: 'http://x.test', steps: [] };

    expect(await stepsFile({ ...steps, name: '!!!' }, '/work', dir.path())).toBe(
      join(dir.path(), 'steps.json'),
    );
    expect(await stepsFile(steps, '/work', dir.path())).toBe(join(dir.path(), 'steps.json'));
  });
});
