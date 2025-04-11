import * as time from '../index';

describe('toMilliseconds', () => {
  it('Can convert from milliseconds', () => {
    expect(time.duration.toMilliseconds({ milliseconds: 1 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(time.duration.toMilliseconds({ seconds: 1 })).toStrictEqual(1000);
  });

  it('Can convert from minutes', () => {
    expect(time.duration.toMilliseconds({ minutes: 1 })).toStrictEqual(60000);
  });

  it('Can convert from hours', () => {
    expect(time.duration.toMilliseconds({ hours: 1 })).toStrictEqual(3.6e6);
  });

  it('Can convert from days', () => {
    expect(time.duration.toMilliseconds({ days: 1 })).toStrictEqual(8.64e7);
  });
});

describe('toSeconds', () => {
  it('Can convert from milliseconds', () => {
    expect(time.duration.toSeconds({ milliseconds: 1000 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(time.duration.toSeconds({ seconds: 1 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(time.duration.toSeconds({ minutes: 1 })).toStrictEqual(60);
  });

  it('Can convert from hours', () => {
    expect(time.duration.toSeconds({ hours: 1 })).toStrictEqual(3600);
  });

  it('Can convert from days', () => {
    expect(time.duration.toSeconds({ days: 1 })).toStrictEqual(86400);
  });
});

describe('toMinutes', () => {
  it('Can convert from milliseconds', () => {
    expect(time.duration.toMinutes({ milliseconds: 60000 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(time.duration.toMinutes({ seconds: 60 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(time.duration.toMinutes({ minutes: 1 })).toStrictEqual(1);
  });

  it('Can convert from hours', () => {
    expect(time.duration.toMinutes({ hours: 1 })).toStrictEqual(60);
  });

  it('Can convert from days', () => {
    expect(time.duration.toMinutes({ days: 1 })).toStrictEqual(1440);
  });
});

describe('toHours', () => {
  it('Can convert from milliseconds', () => {
    expect(time.duration.toHours({ milliseconds: 3.6e6 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(time.duration.toHours({ seconds: 3600 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(time.duration.toHours({ minutes: 60 })).toStrictEqual(1);
  });

  it('Can convert from hours', () => {
    expect(time.duration.toHours({ hours: 1 })).toStrictEqual(1);
  });

  it('Can convert from days', () => {
    expect(time.duration.toHours({ days: 1 })).toStrictEqual(24);
  });
});

describe('toDays', () => {
  it('Can convert from milliseconds', () => {
    expect(time.duration.toDays({ milliseconds: 86400000 })).toStrictEqual(1);
  });

  it('Can convert from seconds', () => {
    expect(time.duration.toDays({ seconds: 86400 })).toStrictEqual(1);
  });

  it('Can convert from minutes', () => {
    expect(time.duration.toDays({ minutes: 1440 })).toStrictEqual(1);
  });

  it('Can convert from hours', () => {
    expect(time.duration.toDays({ hours: 24 })).toStrictEqual(1);
  });

  it('Can convert from days', () => {
    expect(time.duration.toDays({ days: 1 })).toStrictEqual(1);
  });
});
