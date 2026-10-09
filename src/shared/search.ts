export function lastIndexAtOrBefore<T>(
  items: readonly T[],
  value: number,
  keyOf: (item: T) => number,
): number {
  let low = 0;
  let high = items.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const item = items[middle];
    if (item !== undefined && keyOf(item) <= value) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
