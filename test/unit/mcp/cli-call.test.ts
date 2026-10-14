import { describe, expect, it } from 'vitest';
import { childEnv } from '../../../src/mcp/cli-call.js';

describe('childEnv', () => {
  it('passes the environment and the extra values through', () => {
    expect(childEnv({ CURSORCAM_SECRET_A: 'x' }, { PATH: '/bin' }, undefined)).toEqual({
      PATH: '/bin',
      CURSORCAM_SECRET_A: 'x',
    });
  });

  it('makes an Electron runtime, like Claude Desktop, act as plain Node', () => {
    expect(childEnv({}, { PATH: '/bin' }, '37.2.0')).toEqual({
      PATH: '/bin',
      ELECTRON_RUN_AS_NODE: '1',
    });
  });
});
