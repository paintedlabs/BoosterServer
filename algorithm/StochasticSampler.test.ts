import * as status from '@tsnode-template/status';

import * as algorithm from './index';

let randomSpy: jest.SpyInstance<number>;

beforeEach(() => {
  randomSpy = jest.spyOn(global.Math, 'random');
});

afterEach(() => {
  randomSpy.mockRestore();
});

describe('StochasticSampler', () => {
  it('Returns an error when there is no data to sample.', () => {
    const sampler = algorithm.createStochasticSampler({ weights: new Map() });

    expect(sampler).toMatchObject({
      error: expect.any(String),
    });
  });

  it('Returns an error when all weights are less than or equal to zero.', () => {
    const sampler = algorithm.createStochasticSampler({
      weights: new Map([
        ['foo', 0],
        ['bar', -1],
        ['baz', 0],
      ]),
    });

    expect(sampler).toMatchObject({
      error: expect.any(String),
    });
  });

  it('Discards negative weights by default.', () => {
    const sampler = status.throwIfError(
      algorithm.createStochasticSampler({
        weights: new Map([
          ['foo', -1],
          ['bar', -1],
          ['baz', 1],
        ]),
      }),
    );

    expect(sampler.sample()).toBe('baz');
  });

  it('Returns an error on negative weights when strictWeights is enabled.', () => {
    const sampler = algorithm.createStochasticSampler({
      weights: new Map([
        ['foo', -1],
        ['bar', -1],
        ['baz', 1],
      ]),
      strictWeights: true,
    });

    expect(sampler).toMatchObject({
      error: expect.any(String),
    });
  });

  it('Can sample a uniform distribution', () => {
    const sampler = status.throwIfError(
      algorithm.createStochasticSampler({
        weights: new Map([
          ['foo', 1],
          ['bar', 1],
          ['baz', 1],
          ['qux', 1],
        ]),
      }),
    );

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
    const sampler = status.throwIfError(
      algorithm.createStochasticSampler({
        weights: new Map([
          ['foo', 1],
          ['bar', 8],
          ['baz', 1],
        ]),
      }),
    );

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
    const sampler = status.throwIfError(
      algorithm.createStochasticSampler({ weights }),
    );

    weights.clear();
    expect(sampler.sample()).toBe('foo');
  });
});
