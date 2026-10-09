import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { useTempDir } from '../../helpers/temp-dir.js';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'sync-version.mjs');
const MANIFEST = `{
  "name": "cursorcam",
  "version": "1.0.0",
  "author": { "name": "Avijit Dey" }
}
`;

function sync(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
}

describe('sync-version', () => {
  const dir = useTempDir();

  const setUp = async () => {
    const root = dir.path();
    const skill = join(root, 'plugin', 'skills', 'cursorcam');
    await mkdir(join(root, 'plugin', '.claude-plugin'), { recursive: true });
    await mkdir(join(skill, 'references'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ version: '2.3.4' }));
    await writeFile(join(root, 'plugin', '.claude-plugin', 'plugin.json'), MANIFEST);
    await writeFile(join(skill, 'SKILL.md'), 'Run `npx -y cursorcam@1.0.0 doctor`.\n');
    await writeFile(join(skill, 'references', 'steps.md'), 'Use cursorcam@1.0.0-beta.1 here.\n');
    return { root, skill };
  };

  it('finds files that do not match the package version, and fixes them', async () => {
    const { root, skill } = await setUp();

    const checked = sync(root, '--check');
    expect(checked.status).toBe(1);
    expect(checked.stderr).toContain('do not match version 2.3.4');
    expect(checked.stderr).toContain(join('plugin', '.claude-plugin', 'plugin.json'));
    expect(checked.stderr).toContain(
      join('plugin', 'skills', 'cursorcam', 'references', 'steps.md'),
    );
    expect(await readFile(join(skill, 'SKILL.md'), 'utf8')).toContain('cursorcam@1.0.0');

    expect(sync(root).status).toBe(0);
    expect(await readFile(join(root, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8')).toBe(
      MANIFEST.replace('1.0.0', '2.3.4'),
    );
    expect(await readFile(join(skill, 'SKILL.md'), 'utf8')).toBe(
      'Run `npx -y cursorcam@2.3.4 doctor`.\n',
    );
    expect(await readFile(join(skill, 'references', 'steps.md'), 'utf8')).toBe(
      'Use cursorcam@2.3.4 here.\n',
    );
    expect(sync(root, '--check').status).toBe(0);
  });

  it('passes on this repository', () => {
    const result = sync(ROOT, '--check');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^The plugin matches version \d+\.\d+\.\d+(?:-[0-9a-z.]+)?\.$/m);
  });
});
