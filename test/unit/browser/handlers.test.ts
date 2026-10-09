import { describe, expect, it } from 'vitest';
import { safeFileName } from '../../../src/browser/handlers.js';

describe('safeFileName', () => {
  it('keeps download names inside the downloads folder', () => {
    expect(safeFileName('report.pdf')).toBe('report.pdf');
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('..\\..\\win.ini')).toBe('win.ini');
    expect(safeFileName('a:b*c?.txt')).toBe('a_b_c_.txt');
    expect(safeFileName('...')).toBe('download');
    expect(safeFileName('.hidden')).toBe('hidden');
    expect(safeFileName('tab\tname.txt')).toBe('tab_name.txt');
  });

  it('shortens long names but keeps the extension', () => {
    const name = safeFileName(`${'x'.repeat(300)}.csv`);

    expect(name).toHaveLength(120);
    expect(name.endsWith('.csv')).toBe(true);
  });
});
