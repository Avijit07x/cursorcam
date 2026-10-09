import { describe, expect, it } from 'vitest';
import { formatInspect } from '../../../src/inspect/format.js';

describe('formatInspect', () => {
  it('lines up targets and lists warnings', () => {
    const text = formatInspect({
      url: 'http://x',
      frame: '/out/frame.jpg',
      total: 3,
      targets: [
        {
          locator: "role=button[name='Save']",
          role: 'button',
          name: 'Save',
          where: 'in view',
          disabled: false,
        },
        {
          locator: { find: 'text=Go', exact: true },
          role: 'link',
          name: 'Go',
          where: '300 px below',
          disabled: true,
        },
      ],
      warnings: ['label=Date: its picker will not show in the video. Type the value instead.'],
    });

    expect(text.split('\n')).toEqual([
      'Frame: /out/frame.jpg',
      'Targets (showing 2 of 3; use --filter or --limit):',
      "  role=button[name='Save']         button      in view",
      '  {"find":"text=Go","exact":true}  link        300 px below, disabled',
      'Warnings:',
      '  - label=Date: its picker will not show in the video. Type the value instead.',
    ]);
  });

  it('says when nothing was found', () => {
    expect(formatInspect({ url: 'x', frame: 'f', total: 0, targets: [], warnings: [] })).toBe(
      'Frame: f\nNo clickable targets found.',
    );
  });
});
