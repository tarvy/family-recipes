/** Client-side substring filter for recipe search. */

/**
 * Filter items by case-insensitive substring match on a given key.
 *
 * Returns all items when query is empty. The value at `items[i][key]`
 * is cast to string safely before comparison.
 */
export function fuzzySearch<T>(items: T[], query: string, key: keyof T): T[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    return items;
  }
  return items.filter((item) => {
    const value = String(item[key]).toLowerCase();
    return value.includes(trimmed);
  });
}
