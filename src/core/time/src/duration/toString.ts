import * as durationModule from './Duration';

export const toString = (duration: durationModule.Duration): string => {
  if (durationModule.isMilliseconds(duration)) {
    return `${duration.milliseconds}ms`;
  } else if (durationModule.isSeconds(duration)) {
    return `${duration.seconds}s`;
  } else if (durationModule.isMinutes(duration)) {
    return `${duration.minutes}m`;
  } else if (durationModule.isHours(duration)) {
    return `${duration.hours}h`;
  }
  return `${duration.days}d`;
};
