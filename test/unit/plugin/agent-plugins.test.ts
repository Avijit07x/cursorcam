import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { IN_PLUGIN_ENV } from '../../../src/mcp/tool-args.js';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const PLUGIN = join(ROOT, 'agent-plugin');
const SCHEMAS = join(ROOT, 'test', 'fixtures', 'agent-plugins');
const SKILL_NAME = /^(?!.*--)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SKILL_FIELDS = [
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
];
const MAX_SKILL_DESCRIPTION = 1024;
const RESERVED_ENV = ['PLUGIN_ROOT', 'PLUGIN_DATA'];

const read = (file: string) => readFile(file, 'utf8');
const readJson = async (file: string) => JSON.parse(await read(file)) as Record<string, unknown>;
const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

async function schema(name: string): Promise<z.ZodType> {
  const json = await readJson(join(SCHEMAS, `${name}.schema.json`));
  // Zod cannot read `not` in propertyNames; the reserved env names are checked by hand below.
  const text = JSON.stringify(json).replace(/"propertyNames":\{"not":\{"enum":\[[^\]]*\]\}\},/, '');
  return z.fromJSONSchema(JSON.parse(text) as Parameters<typeof z.fromJSONSchema>[0]);
}

interface McpServer {
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly cwd?: string;
}

const pinnedServer = (version: string) => ['-y', `cursorcam@${version}`, 'mcp'];

describe('the open-standard plugin for Codex, Cursor and VS Code', () => {
  it('has an Agent Plugins manifest at the package version', async () => {
    const pkg = await readJson(join(ROOT, 'package.json'));
    const manifest = await readJson(join(PLUGIN, 'plugin.json'));

    expect((await schema('plugin')).safeParse(manifest).success).toBe(true);
    expect(manifest).toMatchObject({
      name: 'cursorcam',
      version: pkg.version,
      license: pkg.license,
      homepage: pkg.homepage,
    });
    const logo = (manifest.extensions as Record<string, { interface: { logo: string } }>)[
      'com.openai'
    ]?.interface.logo;
    expect(await exists(join(PLUGIN, logo ?? 'missing'))).toBe(true);
  });

  it('starts the MCP server pinned to the package version, outside the plugin folder', async () => {
    const pkg = await readJson(join(ROOT, 'package.json'));
    const config = await readJson(join(PLUGIN, 'mcp.json'));

    expect((await schema('mcp')).safeParse(config).success).toBe(true);
    const server = (config.mcpServers as Record<string, McpServer>).cursorcam;
    expect(server).toMatchObject({
      type: 'stdio',
      command: 'npx',
      args: pinnedServer(String(pkg.version)),
      env: { [IN_PLUGIN_ENV]: '1' },
    });
    for (const name of RESERVED_ENV) expect(server?.env).not.toHaveProperty(name);
  });

  it('carries a skill that follows the Agent Skills format', async () => {
    const text = await read(join(PLUGIN, 'skills', 'cursorcam', 'SKILL.md'));
    const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '';
    const fields = [...front.matchAll(/^([a-z-]+):/gm)].map((match) => match[1] ?? '');
    const field = (name: string) => new RegExp(`^${name}: (.*)$`, 'm').exec(front)?.[1] ?? '';

    expect(fields.every((name) => SKILL_FIELDS.includes(name))).toBe(true);
    expect(field('name')).toBe('cursorcam');
    expect(field('name')).toMatch(SKILL_NAME);
    expect(field('description').length).toBeGreaterThan(100);
    expect(field('description').length).toBeLessThanOrEqual(MAX_SKILL_DESCRIPTION);
    expect(text).toContain('MCP tools');
  });

  it('lists only files that exist in its Cursor manifest', async () => {
    const pkg = await readJson(join(ROOT, 'package.json'));
    const manifest = await readJson(join(PLUGIN, '.cursor-plugin', 'plugin.json'));

    expect(manifest).toMatchObject({ name: 'cursorcam', version: pkg.version });
    for (const key of ['logo', 'skills', 'mcpServers']) {
      expect(await exists(join(PLUGIN, String(manifest[key])))).toBe(true);
    }
  });
});

describe('the marketplaces', () => {
  it('point VS Code and Copilot at the open-standard plugin before the Claude Code one', async () => {
    const copilot = await readJson(join(ROOT, '.github', 'plugin', 'marketplace.json'));

    const [entry] = copilot.plugins as { name: string; source: string }[];
    expect(entry?.name).toBe('cursorcam');
    expect(await exists(join(ROOT, entry?.source ?? '', 'plugin.json'))).toBe(true);
    // VS Code reads these before .claude-plugin/marketplace.json; none may hide the Copilot file.
    for (const earlier of ['marketplace.json', join('.plugin', 'marketplace.json')]) {
      expect(await exists(join(ROOT, earlier))).toBe(false);
    }
  });

  it('point Codex and Cursor at the open-standard plugin, and Claude Code at its own', async () => {
    const codex = await readJson(join(ROOT, '.agents', 'plugins', 'marketplace.json'));
    const cursor = await readJson(join(ROOT, '.cursor-plugin', 'marketplace.json'));
    const claude = await readJson(join(ROOT, '.claude-plugin', 'marketplace.json'));

    const [codexEntry] = codex.plugins as { name: string; source: { path: string } }[];
    expect(codexEntry?.name).toBe('cursorcam');
    expect(await exists(join(ROOT, codexEntry?.source.path ?? '', 'plugin.json'))).toBe(true);

    const [cursorEntry] = cursor.plugins as { name: string; source: string }[];
    expect(cursorEntry?.name).toBe('cursorcam');
    expect(
      await exists(join(ROOT, cursorEntry?.source ?? '', '.cursor-plugin', 'plugin.json')),
    ).toBe(true);

    const [claudeEntry] = claude.plugins as { source: string }[];
    expect(
      await exists(join(ROOT, claudeEntry?.source ?? '', '.claude-plugin', 'plugin.json')),
    ).toBe(true);
  });
});

describe('the Gemini CLI extension', () => {
  it('runs the pinned MCP server in the workspace, from the plugin folder and the repo root', async () => {
    const pkg = await readJson(join(ROOT, 'package.json'));
    for (const file of [
      join(PLUGIN, 'gemini-extension.json'),
      join(ROOT, 'gemini-extension.json'),
    ]) {
      const manifest = await readJson(file);
      expect(manifest).toMatchObject({ name: 'cursorcam', version: pkg.version });
      expect((manifest.mcpServers as Record<string, McpServer>).cursorcam).toEqual({
        command: 'npx',
        args: pinnedServer(String(pkg.version)),
        cwd: '${workspacePath}',
      });
    }
  });

  it('adds a /cursorcam command that passes the request on', async () => {
    const commands = await readdir(join(PLUGIN, 'commands'));
    const command = await read(join(PLUGIN, 'commands', 'cursorcam.toml'));

    expect(commands).toEqual(['cursorcam.toml']);
    expect(command).toMatch(/^description = ".+"$/m);
    expect(command).toMatch(/^prompt = """\n[\s\S]*\{\{args\}\}[\s\S]*"""$/m);
  });
});
