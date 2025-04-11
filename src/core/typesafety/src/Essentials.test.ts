import * as typesafety from './index';

describe('normalizeArrayOrSingle', () => {
  it('normalizes a single type.', () => {
    expect(typesafety.normalizeArrayOrSingle(100)).toStrictEqual([100]);
  });

  it('normalizes an array type.', () => {
    expect(typesafety.normalizeArrayOrSingle([100])).toStrictEqual([100]);
  });
});
