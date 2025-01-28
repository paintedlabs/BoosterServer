import * as algorithm from './index';

let randomSpy: jest.SpyInstance<number>;

beforeEach(() => {
  randomSpy = jest.spyOn(global.Math, 'random');
});

afterEach(() => {
  randomSpy.mockRestore();
});

describe('StochasticSampler', () => {
  it('Returns null when there is no data to sample.', () => {
    const sampler = algorithm.createStochasticSampler({ weights: new Map() });

    expect(sampler).toBeNull();
  });

  it('Can sample a uniform distribution', () => {
    const sampler = algorithm.createStochasticSampler({
      weights: new Map([
        ['foo', 1],
        ['bar', 1],
        ['baz', 1],
        ['qux', 1],
      ]),
    });

    if (sampler == null) {
      throw new Error();
    }

    randomSpy.mockReturnValue(0.2);
    expect(sampler.sample()).toBe('foo');

    randomSpy.mockReturnValue(0.4);
    expect(sampler.sample()).toBe('bar');

    randomSpy.mockReturnValue(0.6);
    expect(sampler.sample()).toBe('baz');

    randomSpy.mockReturnValue(0.8);
    expect(sampler.sample()).toBe('qux');
  });

  it('Can sample a non-uniform distribution.', () => {
    const sampler = algorithm.createStochasticSampler({
      weights: new Map([
        ['foo', 1],
        ['bar', 8],
        ['baz', 1],
      ]),
    });

    if (sampler == null) {
      throw new Error();
    }

    randomSpy.mockReturnValue(0);
    expect(sampler.sample()).toBe('foo');
    randomSpy.mockReturnValue(0.099);
    expect(sampler.sample()).toBe('foo');

    randomSpy.mockReturnValue(0.1);
    expect(sampler.sample()).toBe('bar');
    randomSpy.mockReturnValue(0.899);
    expect(sampler.sample()).toBe('bar');

    randomSpy.mockReturnValue(0.9);
    expect(sampler.sample()).toBe('baz');
    randomSpy.mockReturnValue(0.999);
    expect(sampler.sample()).toBe('baz');
  });

  it('Modifying the weights after creation has no impact.', () => {
    const weights = new Map([['foo', 1]]);
    const sampler = algorithm.createStochasticSampler({ weights });

    if (sampler == null) {
      throw new Error();
    }

    weights.clear();
    expect(sampler.sample()).toBe('foo');
  });
});
