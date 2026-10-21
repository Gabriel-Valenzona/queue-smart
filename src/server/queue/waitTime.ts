/**
 * Rule-based wait estimate: position × expected service duration.
 * Position 1 (next in line) waits about one service duration.
 */
export function estimateWaitMinutes(position: number, durationMinutes: number) {
  if (position < 1) return 0;
  return position * durationMinutes;
}
