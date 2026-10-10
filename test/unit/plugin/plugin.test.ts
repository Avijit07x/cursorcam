import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRESET_NAMES } from '../../../src/config/presets.js';
import { ACTION_NAMES, StepsFileSchema } from '../../../src/config/steps.js';
import { PALETTE_NAMES, SCENES } from '../../../src/config/scenes.js';
import { GRADIENTS, StyleSchema } from '../../../src/config/style.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const PLUGIN = join(ROOT, 'plugin');
const SKILL = join(PLUGIN, 'skills', 'cursorcam');
const COMMANDS = join(ROOT, 'src', 'cli', 'commands');
const MAX_DESCRIPTION = 1536;
const MAX_SKILL_LINES = 500;
const STEP_OPTIONS = ['zoom', 'speed', 'pauseAfter', 'dialog'];
const TARGET_FORMS = [
  'role=',
  'label=',
  'text=',
  'placeholder=',
  'testid=',
  'alt=',
  'title=',
  'css=',
];
const TARGET_KEYS = ['find', 'nth', 'within', 'near', 'frame', 'exact'];

const read = (file: string) => readFile(file, 'utf8');
const readJson = async (file: string) => JSON.parse(await read(file)) as Record<string, unknown>;

async function skillDocs(): Promise<string> {
  const files = await readdir(SKILL, { recursive: true, withFileTypes: true });
  const markdown = files.filter((entry) => entry.isFile() && entry.name.endsWith('.md'));
  const texts = await Promise.all(
    markdown.map((entry) => read(join(entry.parentPath, entry.name))),
  );
  return texts.join('\n');
}

describe('the Claude Code plugin', () => {
  it('lists the plugin in the marketplace, at the package version', async () => {
    const pkg = await readJson(join(ROOT, 'package.json'));
    const manifest = await readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'));
    const marketplace = await readJson(join(ROOT, '.claude-plugin', 'marketplace.json'));

    expect(manifest).toMatchObject({
      name: 'cursorcam',
      version: pkg.version,
      license: pkg.license,
      homepage: pkg.homepage,
    });
    expect(marketplace).toMatchObject({
      name: 'cursorcam',
      plugins: [expect.objectContaining({ name: 'cursorcam', source: './plugin' })],
    });
  });

  it('has a skill with the fields Claude Code reads, and working links', async () => {
    const text = await read(join(SKILL, 'SKILL.md'));
    const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '';
    const field = (name: string) => new RegExp(`^${name}: (.*)$`, 'm').exec(front)?.[1] ?? '';

    expect(field('name')).toBe('cursorcam');
    expect(field('description').length).toBeGreaterThan(100);
    expect(field('description').length).toBeLessThan(MAX_DESCRIPTION);
    expect(field('allowed-tools')).toMatch(
      /^Bash\(npx -y cursorcam@\d+\.\d+\.\d+(?:-[0-9a-z.]+)? \*\)$/,
    );
    expect(text.split('\n').length).toBeLessThan(MAX_SKILL_LINES);
    const links = [...text.matchAll(/\]\(([^)#]+\.md)\)/g)].map((match) => match[1] ?? '');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) await expect(access(join(SKILL, link))).resolves.toBeUndefined();
  });

  it('runs the env guard from its hooks file', async () => {
    const hooks = (await readJson(join(PLUGIN, 'hooks', 'hooks.json'))) as {
      hooks: { PreToolUse: { matcher: string; hooks: { command: string }[] }[] };
    };
    const [entry] = hooks.hooks.PreToolUse;
    expect(entry?.matcher).toBe('Bash');
    expect(entry?.hooks[0]?.command).toBe('sh "${CLAUDE_PLUGIN_ROOT}/hooks/env-guard.sh"');
    await expect(access(join(PLUGIN, 'hooks', 'env-guard.sh'))).resolves.toBeUndefined();
  });

  it('documents every step action, option, target form and top-level key', async () => {
    const steps = await read(join(SKILL, 'references', 'steps.md'));
    const keys = Object.keys(StepsFileSchema.shape).filter(
      (key) => key !== '$schema' && key !== 'steps',
    );
    for (const name of [...ACTION_NAMES, ...STEP_OPTIONS, ...keys, ...TARGET_KEYS]) {
      expect(steps).toContain(`\`${name}\``);
    }
    for (const form of TARGET_FORMS) expect(steps).toContain(form);
  });

  it('documents every style key, background, preset and exit code', async () => {
    const style = await read(join(SKILL, 'references', 'style.md'));
    const troubleshooting = await read(join(SKILL, 'references', 'troubleshooting.md'));
    const styleKeys = Object.keys(StyleSchema.shape).filter((key) => key !== 'format');
    const presets = PRESET_NAMES.filter((name) => name !== 'default');
    const backgrounds = [...Object.keys(GRADIENTS), ...SCENES, ...PALETTE_NAMES];
    for (const name of [...styleKeys, ...backgrounds, ...presets]) {
      expect(style).toContain(`\`${name}\``);
    }
    expect(style).toContain('`--format <format>`');
    for (const code of Object.values(ExitCode)) expect(troubleshooting).toContain(`| ${code} |`);
  });

  it('only uses commands and options the CLI has', async () => {
    const docs = await skillDocs();
    const files = (await readdir(COMMANDS)).filter((name) => name.endsWith('.ts'));
    const commands = new Set(files.map((name) => name.replace(/\.ts$/, '')));
    const sources = await Promise.all(files.map((name) => read(join(COMMANDS, name))));
    const cli = sources.join('\n');

    const used = [...docs.matchAll(/cursorcam ([a-z]+)/g)].map((match) => match[1] ?? '');
    expect(used.length).toBeGreaterThan(10);
    for (const command of used) expect(commands).toContain(command);
    const options = new Set([...docs.matchAll(/(--[a-z][a-z-]*)/g)].map((match) => match[1] ?? ''));
    for (const option of options) expect(cli).toContain(`'${option}`);
  });
});
