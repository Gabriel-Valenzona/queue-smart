let counter = 0;

/** Simple client-side id generator for mock records. */
export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
