/**
 * Capitalize the first letter of each word in a name.
 * e.g. "ramesh kumar" -> "Ramesh Kumar". Collapses extra inner spaces.
 */
export function titleCaseName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
