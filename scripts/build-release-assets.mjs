// Builds the files attached to each GitHub release, into release/:
// - cursorcam.mcpb, the one-click Claude Desktop extension, with its dependencies inside.
// - <platform>.cursorcam.tar.gz, the Gemini CLI extension. Gemini picks the asset named for
//   the user's platform, so these stay small and the .mcpb is never mistaken for one.
// Run it after `pnpm build`.
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'release');
const AGENT_PLUGIN = join(ROOT, 'agent-plugin');
const MCPB_CLI = '@anthropic-ai/mcpb@2.1.2';
const MANIFEST_VERSION = '0.4';
const GEMINI_PLATFORMS = ['darwin', 'linux', 'win32'];
const NOT_SHIPPED = ['pnpm-lock.yaml', 'pnpm-workspace.yaml', join('node_modules', '.bin')];
const VERIFY_TIMEOUT_MS = 60_000;

const run = (command, args, cwd = ROOT) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });

function mcpbManifest(pkg, tools) {
  return {
    manifest_version: MANIFEST_VERSION,
    name: pkg.name,
    display_name: 'CursorCam',
    version: pkg.version,
    description:
      'Ask Claude for a demo video of your web app: a polished MP4 with auto-zoom, a smooth cursor and click ripples.',
    long_description:
      'Claude explores your web app, writes the steps, records them in a hidden browser with the Chrome, Edge, Chromium or Brave you already have, checks stills of the video and hands back the MP4. Videos are saved in cursorcam-output in your home folder.',
    author: { name: pkg.author, url: 'https://github.com/avijit07x' },
    repository: { type: 'git', url: 'https://github.com/Avijit07x/cursorcam' },
    homepage: pkg.homepage,
    documentation: 'https://cursorcam.vercel.app/docs/mcp',
    support: pkg.bugs.url,
    icon: 'icon.png',
    server: {
      type: 'node',
      entry_point: 'dist/cli/index.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/dist/cli/index.js', 'mcp'],
        env: { CURSORCAM_MCP_IN_PLUGIN: '1' },
      },
    },
    tools,
    keywords: ['demo video', 'screen recording', 'walkthrough', 'mp4', 'browser'],
    license: pkg.license,
    compatibility: {
      platforms: ['darwin', 'win32', 'linux'],
      runtimes: { node: pkg.engines.node },
    },
  };
}

async function buildMcpb(pkg) {
  const stage = await mkdtemp(join(tmpdir(), 'cursorcam-mcpb-'));
  try {
    // A flat node_modules from the lockfile: the bundle is a zip, which cannot keep symlinks.
    run('pnpm', ['--filter', pkg.name, '--config.node-linker=hoisted', 'deploy', '--prod', stage]);
    for (const extra of NOT_SHIPPED) await rm(join(stage, extra), { recursive: true, force: true });
    await copyFile(join(AGENT_PLUGIN, 'assets', 'logo.png'), join(stage, 'icon.png'));
    const { createTools } = await import(
      pathToFileURL(join(stage, 'dist', 'mcp', 'tools.js')).href
    );
    const tools = createTools(() => Promise.reject(new Error('unused'))).map(
      ({ name, description }) => ({ name, description }),
    );
    await writeFile(
      join(stage, 'manifest.json'),
      `${JSON.stringify(mcpbManifest(pkg, tools), null, 2)}\n`,
    );
    run('pnpm', ['dlx', MCPB_CLI, 'pack', stage, join(OUT, `${pkg.name}.mcpb`)]);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

// Starts the packed server the way Claude Desktop does and checks that it lists every tool.
async function verifyMcpb(pkg) {
  const dir = await mkdtemp(join(tmpdir(), 'cursorcam-mcpb-check-'));
  try {
    run('pnpm', ['dlx', MCPB_CLI, 'unpack', join(OUT, `${pkg.name}.mcpb`), dir]);
    const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
    const { args, env } = manifest.server.mcp_config;
    const child = spawn(
      process.execPath,
      args.map((arg) => arg.replace('${__dirname}', dir)),
      {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'inherit'],
      },
    );
    const lines = createInterface({ input: child.stdout });
    const listed = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('The packed server did not answer.')),
        VERIFY_TIMEOUT_MS,
      );
      lines.on('line', (line) => {
        const message = JSON.parse(line);
        if (message.id !== 2) return;
        clearTimeout(timer);
        resolve(message.result.tools.map((tool) => tool.name));
      });
    });
    const send = (message) =>
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
    send({
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {} },
    });
    send({ method: 'notifications/initialized' });
    send({ id: 2, method: 'tools/list' });
    try {
      const names = await listed;
      const expected = manifest.tools.map((tool) => tool.name);
      if (names.join() !== expected.join()) {
        throw new Error(`The packed server lists ${names.join(', ')}, not ${expected.join(', ')}.`);
      }
    } finally {
      lines.close();
      child.stdin.end();
      child.kill();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function buildGeminiArchives(pkg) {
  for (const platform of GEMINI_PLATFORMS) {
    run('tar', ['-czf', join(OUT, `${platform}.${pkg.name}.tar.gz`), '-C', AGENT_PLUGIN, '.']);
  }
}

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
await access(join(ROOT, 'dist', 'cli', 'index.js')).catch(() => {
  throw new Error('dist/ is missing. Run pnpm build first.');
});
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT);
buildGeminiArchives(pkg);
await buildMcpb(pkg);
await verifyMcpb(pkg);
console.log(`Release assets for ${pkg.version} are in release/.`);
