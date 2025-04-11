// ts-essentials has a comprehensive list of TypeScript add-ons that we export
// as a convenience in addition to our own custom helpers.
//
// See https://github.com/ts-essentials/ts-essentials
export * from 'ts-essentials';

/// We additional supplement ts-essentials with a few helpers.

import * as tsEssentials from 'ts-essentials';

export const normalizeArrayOrSingle = <T>(
  data: tsEssentials.ArrayOrSingle<T>,
): Array<T> => {
  if (Array.isArray(data)) {
    return data;
  }

  return [data];
};
