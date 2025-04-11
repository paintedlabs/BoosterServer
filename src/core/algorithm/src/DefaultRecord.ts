import * as typesafety from '@core/typesafety';

type RecordKeyType = string | symbol;

/**
 * DefaultRecord behaves exactly the same as an ordinary record *except* that
 * accessing an unset key will set and return a default value.
 *
 * This is inspired by python's `defaultdict`.
 */
export type DefaultRecord<K extends RecordKeyType, V> = typesafety.Brand<
  Record<K, V>,
  '@toolkit/algorithm#DefaultRecord'
>;

/**
 * Creates a new `DefaultRecord`.
 *
 * @param initialValue - The initial contents of the default record.
 * @param defaultValueFactory - A factory for creating default values used when
 *   an unset key is accessed.
 *
 * @returns A new default record.
 */
export const createDefaultRecord = <K extends RecordKeyType, V>(
  initialValue: Record<K, V>,
  defaultValueFactory: (key: K) => V,
): DefaultRecord<K, V> =>
  typesafety.stampBrand(
    new Proxy(initialValue, {
      get(target, property) {
        if (Reflect.has(target, property)) {
          return Reflect.get(target, property);
        }

        const defaultValue = defaultValueFactory(property as K);
        Reflect.set(target, property, defaultValue);
        return defaultValue;
      },
    }),
  );
