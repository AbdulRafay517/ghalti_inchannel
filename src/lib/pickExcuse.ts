export function pickExcuse<T extends { id: number }>(
  list: readonly T[],
  prevId: number | null,
  rand: () => number = Math.random,
): T | null {
  // Avoid repeating the last excuse when there is any alternative.
  const pool = list.length > 1 ? list.filter((e) => e.id !== prevId) : list;
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}
