import * as durationModule from './Duration';

export const toMilliseconds = (duration: durationModule.Duration): number => {
  if (durationModule.isMilliseconds(duration)) {
    return duration.milliseconds;
  } else if (durationModule.isSeconds(duration)) {
    return duration.seconds * 1000;
  } else if (durationModule.isMinutes(duration)) {
    return duration.minutes * 1000 * 60;
  } else if (durationModule.isHours(duration)) {
    return duration.hours * 1000 * 60 * 60;
  }
  return duration.days * 1000 * 60 * 60 * 24;
};

export const toSeconds = (duration: durationModule.Duration): number => {
  if (durationModule.isMilliseconds(duration)) {
    return duration.milliseconds / 1000;
  } else if (durationModule.isSeconds(duration)) {
    return duration.seconds;
  } else if (durationModule.isMinutes(duration)) {
    return duration.minutes * 60;
  } else if (durationModule.isHours(duration)) {
    return duration.hours * 60 * 60;
  }
  return duration.days * 60 * 60 * 24;
};

export const toMinutes = (duration: durationModule.Duration): number => {
  if (durationModule.isMilliseconds(duration)) {
    return duration.milliseconds / 60 / 1000;
  } else if (durationModule.isSeconds(duration)) {
    return duration.seconds / 60;
  } else if (durationModule.isMinutes(duration)) {
    return duration.minutes;
  } else if (durationModule.isHours(duration)) {
    return duration.hours * 60;
  }
  return duration.days * 60 * 24;
};

export const toHours = (duration: durationModule.Duration): number => {
  if (durationModule.isMilliseconds(duration)) {
    return duration.milliseconds / 60 / 60 / 1000;
  } else if (durationModule.isSeconds(duration)) {
    return duration.seconds / 60 / 60;
  } else if (durationModule.isMinutes(duration)) {
    return duration.minutes / 60;
  } else if (durationModule.isHours(duration)) {
    return duration.hours;
  }
  return duration.days * 24;
};

export const toDays = (duration: durationModule.Duration): number => {
  if (durationModule.isMilliseconds(duration)) {
    return duration.milliseconds / 24 / 60 / 60 / 1000;
  } else if (durationModule.isSeconds(duration)) {
    return duration.seconds / 24 / 60 / 60;
  } else if (durationModule.isMinutes(duration)) {
    return duration.minutes / 24 / 60;
  } else if (durationModule.isHours(duration)) {
    return duration.hours / 24;
  }
  return duration.days;
};
