export type TextQueryKind = 'label' | 'text' | 'placeholder' | 'testid' | 'alt' | 'title';

export type LocatorQuery =
  | { readonly kind: 'role'; readonly role: string; readonly name?: string }
  | { readonly kind: TextQueryKind; readonly value: string }
  | { readonly kind: 'css'; readonly selector: string };

const ROLE_PATTERN = /^role=([a-z]+)(?:\[name=(['"])(.*)\2\])?$/is;
const PREFIXED_PATTERN = /^([a-z]+)=(.*)$/s;
const TEXT_QUERY_KINDS: ReadonlySet<string> = new Set<TextQueryKind>([
  'label',
  'text',
  'placeholder',
  'testid',
  'alt',
  'title',
]);

export class LocatorSyntaxError extends Error {
  override readonly name = 'LocatorSyntaxError';
}

export function parseLocator(source: string): LocatorQuery {
  const trimmed = source.trim();
  if (trimmed === '') throw new LocatorSyntaxError('A target cannot be empty.');
  if (trimmed.startsWith('role=')) return parseRole(trimmed);

  const prefixed = PREFIXED_PATTERN.exec(trimmed);
  const prefix = prefixed?.[1]?.toLowerCase();
  const rest = prefixed?.[2] ?? '';
  if (prefix === 'css') return { kind: 'css', selector: requireValue(rest, trimmed) };
  if (prefix !== undefined && TEXT_QUERY_KINDS.has(prefix)) {
    return { kind: prefix as TextQueryKind, value: requireValue(unquote(rest), trimmed) };
  }
  return { kind: 'css', selector: trimmed };
}

export function formatLocator(query: LocatorQuery): string {
  switch (query.kind) {
    case 'role':
      return query.name === undefined
        ? `role=${query.role}`
        : `role=${query.role}[name=${quote(query.name)}]`;
    case 'css':
      return query.selector;
    default:
      return `${query.kind}=${query.value}`;
  }
}

function parseRole(source: string): LocatorQuery {
  const match = ROLE_PATTERN.exec(source);
  const role = match?.[1];
  if (!role) {
    throw new LocatorSyntaxError(
      `"${source}" is not a valid role target. Use role=button or role=button[name='Save'].`,
    );
  }
  const name = match[3];
  return name === undefined
    ? { kind: 'role', role: role.toLowerCase() }
    : { kind: 'role', role: role.toLowerCase(), name };
}

function requireValue(value: string, source: string): string {
  const trimmed = value.trim();
  if (trimmed === '') throw new LocatorSyntaxError(`"${source}" has nothing after "=".`);
  return trimmed;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  if (trimmed.length >= 2 && (first === '"' || first === "'") && trimmed.at(-1) === first) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function quote(value: string): string {
  return value.includes("'") ? `"${value}"` : `'${value}'`;
}
