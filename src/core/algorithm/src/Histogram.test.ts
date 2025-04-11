import * as algorithm from './index';

describe('Histogram', () => {
  describe('getCount', () => {
    test('Returns zero for an unknown key.', () => {
      const histogram = algorithm.createHistogram<string>();
      expect(histogram.getCount('foo')).toBe(0);
      expect(histogram.getCount('bar')).toBe(0);
    });
  });

  describe('increment', () => {
    test('Increments by 1 when amount is undefined.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.increment('foo');
      histogram.increment('bar');
      histogram.increment('bar');

      expect(histogram.getCount('foo')).toBe(1);
      expect(histogram.getCount('bar')).toBe(2);
    });

    test('Can increment by a positive amount.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.increment('foo', 3);
      expect(histogram.getCount('foo')).toBe(3);
    });

    test('Can increment by a negative amount.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.increment('foo', -3);
      expect(histogram.getCount('foo')).toBe(0);
    });
  });

  describe('decrement', () => {
    test('Decrements by 1 when amount is undefined.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.incrementMany(['foo', 'bar'], 3);
      histogram.decrement('foo');
      histogram.decrement('bar');
      histogram.decrement('bar');

      expect(histogram.getCount('foo')).toBe(2);
      expect(histogram.getCount('bar')).toBe(1);
    });

    test('Can decrement by a positive amount.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.increment('foo', 5);
      histogram.decrement('foo', 3);
      expect(histogram.getCount('foo')).toBe(2);

      histogram.decrement('foo', 2);
      expect(histogram.getCount('foo')).toBe(0);
    });

    test('Can decrement by a negative amount.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.decrement('foo', -3);
      expect(histogram.getCount('foo')).toBe(3);
    });
  });

  describe('entries', () => {
    test('Lists all known buckets.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.increment('foo', 1);
      histogram.increment('bar', 2);
      histogram.increment('baz', 3);
      expect(Array.from(histogram.entries())).toStrictEqual([
        ['foo', 1],
        ['bar', 2],
        ['baz', 3],
      ]);
    });

    test('Values with zero counts are not included.', () => {
      const histogram = algorithm.createHistogram<string>();

      histogram.increment('foo', 1);
      histogram.increment('bar', 2);
      histogram.increment('baz', 3);
      expect(Array.from(histogram.entries())).toStrictEqual([
        ['foo', 1],
        ['bar', 2],
        ['baz', 3],
      ]);

      histogram.decrement('bar', 100);
      expect(Array.from(histogram.entries())).toStrictEqual([
        ['foo', 1],
        ['baz', 3],
      ]);
    });
  });
});
