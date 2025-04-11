import * as time from '../index';

describe('toString', () => {
  it('supports milliseconds.', () => {
    expect(time.duration.toString({ milliseconds: 5 })).toStrictEqual('5ms');
  });

  it('supports seconds', () => {
    expect(time.duration.toString({ seconds: 5 })).toStrictEqual('5s');
  });

  it('supports minutes', () => {
    expect(time.duration.toString({ minutes: 5 })).toStrictEqual('5m');
  });

  it('supports hours', () => {
    expect(time.duration.toString({ hours: 5 })).toStrictEqual('5h');
  });

  it('supports days', () => {
    expect(time.duration.toString({ days: 5 })).toStrictEqual('5d');
  });
});
