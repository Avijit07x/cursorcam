import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default function setup(): void {
  const tsc = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
}
