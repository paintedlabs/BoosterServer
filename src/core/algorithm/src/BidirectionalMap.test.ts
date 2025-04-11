import * as algorithm from './index';

describe('BidirectionalMap', () => {
  it('is empty by default.', () => {
    const map = algorithm.createBidirectionalMap();
    expect(Array.from(map.entries())).toStrictEqual([]);
  });

  it('can be initialized with entries.', () => {
    const map = algorithm.createBidirectionalMap([
      ['foo', 100],
      ['bar', 200],
      ['baz', 300],
    ]);
    expect(Array.from(map.entries())).toStrictEqual([
      ['foo', 100],
      ['bar', 200],
      ['baz', 300],
    ]);
  });

  it('can evaluate key inclusion and value inclusion.', () => {
    const foo = {};
    const bar = {};
    const baz = {};
    const qux = {};

    const map = algorithm.createBidirectionalMap([
      [foo, bar],
      [baz, qux],
    ]);

    // Expect the keys to be populated.
    expect(map.hasKey(foo)).toBe(true);
    expect(map.hasKey(baz)).toBe(true);

    // Expect the values to be populated.
    expect(map.hasValue(bar)).toBe(true);
    expect(map.hasValue(qux)).toBe(true);

    // Ensure that the values are not used as keys.
    expect(map.hasKey(bar)).toBe(false);
    expect(map.hasKey(qux)).toBe(false);

    // Ensure that the keys are not used as values.
    expect(map.hasValue(foo)).toBe(false);
    expect(map.hasValue(baz)).toBe(false);
  });

  it('can get values from keys and visa versa.', () => {
    const foo = {};
    const bar = {};
    const baz = {};
    const qux = {};

    const map = algorithm.createBidirectionalMap([
      [foo, bar],
      [baz, qux],
    ]);

    // Expect the values to be indexed by key.
    expect(map.getValue(foo)).toBe(bar);
    expect(map.getValue(baz)).toBe(qux);

    // Expect the keys to be indexed by value.
    expect(map.getKey(bar)).toBe(foo);
    expect(map.getKey(qux)).toBe(baz);

    // Ensure that we don't index the values by themselves.
    expect(map.getValue(bar)).toBe(undefined);
    expect(map.getValue(qux)).toBe(undefined);

    // Ensure that we don't index the keys by themselves.
    expect(map.getKey(foo)).toBe(undefined);
    expect(map.getKey(baz)).toBe(undefined);
  });

  it('can delete by key and delete by value.', () => {
    const map = algorithm.createBidirectionalMap([
      ['foo', 'bar'],
      ['baz', 'qux'],
    ]);

    // Delete the key-value pair `[baz, qux]` by key.
    expect(map.deleteKey('baz')).toStrictEqual(['baz', 'qux']);
    expect(map.getValue('baz')).toBe(undefined);
    expect(map.getKey('qux')).toBe(undefined);

    // Ensure that the key-value pair `[foo, bar]` still exists.
    expect(Array.from(map.entries())).toStrictEqual([['foo', 'bar']]);

    // Delete the key-value pair `[foo, bar]` by value.
    expect(map.deleteValue('bar')).toStrictEqual(['foo', 'bar']);
    expect(map.getValue('foo')).toBe(undefined);
    expect(map.getKey('bar')).toBe(undefined);

    // Ensure that additional delete calls are no-ops.
    expect(map.deleteKey('baz')).toBe(undefined);
    expect(map.deleteValue('bar')).toBe(undefined);
  });

  it('maintains one-to-one correspondence when linking new pairs.', () => {
    const map = algorithm.createBidirectionalMap([
      ['foo', 'bar'],
      ['baz', 'qux'],
    ]);
    expect(map.link('foo', 'qux')).toStrictEqual([
      ['foo', 'bar'],
      ['baz', 'qux'],
    ]);
    expect(Array.from(map.entries())).toStrictEqual([['foo', 'qux']]);
  });
});
