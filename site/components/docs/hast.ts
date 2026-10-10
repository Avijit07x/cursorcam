interface HastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  properties?: Record<string, unknown>;
  readonly children?: readonly HastNode[];
}

const elements = (node: HastNode, tagName: string): HastNode[] =>
  (node.children ?? []).flatMap((child) => [
    ...(child.tagName === tagName ? [child] : []),
    ...elements(child, tagName),
  ]);

export const textOf = (node: HastNode | undefined): string =>
  node?.value ?? node?.children?.map(textOf).join('') ?? '';

function labelCells(table: HastNode) {
  const [header, ...rows] = elements(table, 'tr');
  const labels = header ? elements(header, 'th').map(textOf) : [];
  for (const row of rows) {
    elements(row, 'td').forEach((cell, index) => {
      cell.properties = { ...cell.properties, dataLabel: labels[index] ?? '' };
    });
  }
}

export function rehypeCellLabels() {
  return (tree: HastNode) => {
    elements(tree, 'table').forEach(labelCells);
  };
}
