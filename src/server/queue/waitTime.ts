/**
 * Wait-time estimation for the queue module.
 *
 * The baseline rule is position × expected service duration. When a service
 * has served enough users to measure how long it actually takes, the observed
 * pace is blended with the configured duration, which acts as a prior so one
 * unusual visit cannot swing the estimate. No stored estimates are kept; every
 * value is derived from the queue store when it is read.
 */
import type {
  CompletedParticipation,
  EntryStatus,
  QueueService,
  WaitEstimate,
} from "./types";

/** An estimated wait at or below this many minutes counts as "almost ready". */
export const ALMOST_READY_MINUTES = 5;
/** A waiting user is told again once their estimate moves by this much. */
export const WAIT_CHANGE_MINUTES = 5;
/** How many recent completions inform the observed service time. */
export const OBSERVED_WINDOW = 5;

/** Rule-based baseline: position 1 waits about one service duration. */
export function estimateWaitMinutes(position: number, durationMinutes: number) {
  if (position < 1) return 0;
  return position * durationMinutes;
}

/**
 * Minutes between consecutive served completions for one service. Two
 * completions are needed to measure one interval, so a service that has just
 * opened keeps using its configured duration.
 */
export function observedServiceIntervals(
  completed: CompletedParticipation[],
  serviceId: string,
  window = OBSERVED_WINDOW,
): number[] {
  const servedAt = completed
    .filter((record) => record.serviceId === serviceId && record.outcome === "served")
    .map((record) => Date.parse(record.completedAt))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)
    .slice(0, window + 1);

  const intervals: number[] = [];
  for (let index = 0; index < servedAt.length - 1; index += 1) {
    const minutes = (servedAt[index] - servedAt[index + 1]) / 60_000;
    if (minutes > 0) intervals.push(minutes);
  }
  return intervals;
}

/** Combines the configured duration with observed intervals, if there are any. */
export function effectiveServiceMinutes(
  service: Pick<QueueService, "duration">,
  intervals: number[],
): Pick<WaitEstimate, "serviceMinutes" | "basis" | "sampleSize"> {
  if (!intervals.length)
    return {
      serviceMinutes: service.duration,
      basis: "configured",
      sampleSize: 0,
    };
  const observed = intervals.reduce((total, value) => total + value, 0);
  // The configured duration counts as one observation.
  const blended = (service.duration + observed) / (1 + intervals.length);
  return {
    serviceMinutes: Math.round(blended * 10) / 10,
    basis: "observed",
    sampleSize: intervals.length,
  };
}

/** The estimate for a given place in line, with the reasoning behind it. */
export function estimateWait(
  position: number,
  service: Pick<QueueService, "id" | "duration">,
  completed: CompletedParticipation[] = [],
): WaitEstimate {
  const pace = effectiveServiceMinutes(
    service,
    observedServiceIntervals(completed, service.id),
  );
  if (position < 1) return { minutes: 0, ...pace };
  return {
    minutes: Math.max(1, Math.round(position * pace.serviceMinutes)),
    ...pace,
  };
}

/** Whoever is next, or anyone within the almost-ready window, is almost ready. */
export function statusFor(position: number, minutes: number): EntryStatus {
  return position <= 1 || minutes <= ALMOST_READY_MINUTES
    ? "almost-ready"
    : "waiting";
}

/** True when an estimate has moved far enough to be worth telling the user. */
export function isSignificantWaitChange(
  previous: number | undefined,
  next: number,
) {
  return previous === undefined || Math.abs(next - previous) >= WAIT_CHANGE_MINUTES;
}
