/**
 * Represents a duration of time using human-readable units.
 *
 *
 * Example Usage;
 *
 * ```ts
 * const duration: Duration = { hours: 2 };
 * ```
 *
 * See `toUnit.ts` for converting a duration to a fixed unit such as
 * `toMilliseconds(duration)`.
 */
export type Duration = Milliseconds | Seconds | Minutes | Hours | Days;

export type Milliseconds = {
  milliseconds: number;
};

export type Seconds = {
  seconds: number;
};

export type Minutes = {
  minutes: number;
};

export type Hours = {
  hours: number;
};

export type Days = {
  days: number;
};

export const isDuration = (
  maybeDuration: Record<string, number>,
): maybeDuration is Duration =>
  isMilliseconds(maybeDuration) ||
  isSeconds(maybeDuration) ||
  isMinutes(maybeDuration) ||
  isHours(maybeDuration) ||
  isDays(maybeDuration);

export const isMilliseconds = (
  maybeDuration: Record<string, number>,
): maybeDuration is Milliseconds => 'milliseconds' in maybeDuration;

export const isSeconds = (
  maybeDuration: Record<string, number>,
): maybeDuration is Seconds => 'seconds' in maybeDuration;

export const isMinutes = (
  maybeDuration: Record<string, number>,
): maybeDuration is Minutes => 'minutes' in maybeDuration;

export const isHours = (
  maybeDuration: Record<string, number>,
): maybeDuration is Hours => 'hours' in maybeDuration;

export const isDays = (
  maybeDuration: Record<string, number>,
): maybeDuration is Days => 'days' in maybeDuration;
