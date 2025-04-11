import * as algorithm from './index';

describe('DefaultMap', () => {
  it('returns default value for unset keys', () => {
    const map = algorithm.createDefaultMap(() => 100);
    expect(map.has('missing')).toBe(false);
    expect(map.get('missing')).toBe(100);
    expect(map.has('missing')).toBe(true);
  });

  it('returns existing values without invoking factory', () => {
    const factory = jest.fn(() => 'default');
    const map = algorithm.createDefaultMap(factory, [['exists', 'value']]);

    expect(map.get('exists')).toBe('value');
    expect(factory).not.toHaveBeenCalled();
  });

  it('passes correct key to factory', () => {
    const factory = jest.fn((key: number) => key * 2);
    const map = algorithm.createDefaultMap(factory);

    expect(map.get(5)).toBe(10);
    expect(factory).toHaveBeenCalledWith(5);
  });

  it('maintains correct size', () => {
    const map = algorithm.createDefaultMap(
      () => null,
      [
        ['a', 1],
        ['b', 2],
      ],
    );
    expect(map.size).toBe(2);

    map.get('c');
    expect(map.size).toBe(3);

    map.delete('a');
    expect(map.size).toBe(2);
  });

  it('supports standard Map methods', () => {
    const map = algorithm.createDefaultMap(() => 'default');

    expect(map.has('key')).toBe(false);
    map.get('key');
    expect(map.has('key')).toBe(true);

    map.set('key', 'custom');
    expect(map.get('key')).toBe('custom');

    map.delete('key');
    expect(map.has('key')).toBe(false);
    expect(map.get('key')).toBe('default');

    expect(Array.from(map.entries())).toStrictEqual([['key', 'default']]);
    expect(Array.from(map.keys())).toStrictEqual(['key']);
    expect(Array.from(map.values())).toStrictEqual(['default']);
  });

  it('saves the default value to the map so that identity is preserved.', () => {
    const map = algorithm.createDefaultMap<string, Array<number>>(() => []);

    const firstLookup = map.get('foo');
    const secondLookup = map.get('foo');
    expect(firstLookup).toBe(secondLookup);
  });

  it('does not treat falsey values as unset keys.', () => {
    const map = algorithm.createDefaultMap<
      string,
      null | undefined | boolean | string
    >(
      () => 'default',
      [
        ['foo', null],
        ['bar', undefined],
        ['baz', false],
        ['qux', ''],
      ],
    );

    expect(map.get('foo')).toBe(null);
    expect(map.get('bar')).toBe(undefined);
    expect(map.get('baz')).toBe(false);
    expect(map.get('qux')).toBe('');
  });

  it('is instance of Map', () => {
    const map = algorithm.createDefaultMap(() => 0);
    expect(map instanceof Map).toBe(true);
  });
});
