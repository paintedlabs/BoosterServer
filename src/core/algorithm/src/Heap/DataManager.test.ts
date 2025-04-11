import * as dataManager from './DataManager';

describe('DataManager', () => {
  it('can remove data from the tail', () => {
    const data = dataManager.createDataManager<number>();
    data.push(100);
    data.push(200);
    data.push(300);

    expect(data.size).toBe(3);

    expect(data.remove(2)?.value).toBe(300);
    expect(data.size).toBe(2);

    expect(data.remove(1)?.value).toBe(200);
    expect(data.size).toBe(1);

    expect(data.remove(0)?.value).toBe(100);
    expect(data.size).toBe(0);
  });

  it('can remove data from the head', () => {
    const data = dataManager.createDataManager<number>();
    data.push(100);
    data.push(200);
    data.push(300);

    expect(data.size).toBe(3);

    expect(data.remove(0)?.value).toBe(100);
    expect(data.size).toBe(2);

    expect(data.remove(0)?.value).toBe(300);
    expect(data.size).toBe(1);

    expect(data.remove(0)?.value).toBe(200);
    expect(data.size).toBe(0);
  });

  it('can swap values', () => {
    const data = dataManager.createDataManager<number>();
    data.push(100);
    data.push(200);
    data.push(300);

    data.swap(0, 2);

    expect(data.get(0)?.value).toBe(300);
    expect(data.get(1)?.value).toBe(200);
    expect(data.get(2)?.value).toBe(100);

    data.swap(1, 2);

    expect(data.get(0)?.value).toBe(300);
    expect(data.get(1)?.value).toBe(100);
    expect(data.get(2)?.value).toBe(200);
  });

  it('can remove using the entry', () => {
    const data = dataManager.createDataManager<number>();
    const entry100 = data.push(100);
    const entry200 = data.push(200);
    const entry300 = data.push(300);

    expect(data.size).toBe(3);

    expect(entry200.remove()).toBe(true);
    expect(data.size).toBe(2);
    expect(data.get(0)?.value).toBe(100);
    expect(data.get(1)?.value).toBe(300);

    expect(entry100.remove()).toBe(true);
    expect(data.size).toBe(1);
    expect(data.get(0)?.value).toBe(300);

    expect(entry300.remove()).toBe(true);
    expect(data.size).toBe(0);
  });

  it('correctly removes after swap', () => {
    const data = dataManager.createDataManager<number>();
    data.push(100);
    const entry200 = data.push(200);
    data.push(300);

    expect(data.size).toBe(3);

    data.swap(0, 1);

    expect(entry200.remove()).toBe(true);
    expect(data.size).toBe(2);
    expect(data.get(0)?.value).toBe(300);
    expect(data.get(1)?.value).toBe(100);
  });

  it('guards against removing an entry multiple times', () => {
    const data = dataManager.createDataManager<number>();
    const entry = data.push(100);

    expect(data.size).toBe(1);
    expect(entry.removed).toBe(false);
    expect(entry.index).toBe(0);

    expect(entry.remove()).toBe(true);
    expect(entry.removed).toBe(true);
    expect(entry.index).toBe(-1);
    expect(data.size).toBe(0);

    expect(entry.remove()).toBe(false);
  });
});
