/**
 * Unlike a flavor which supports implicit casting from type `T` to a flavor of
 * type `T`, brands require explicit casting via `stampBrand`. This is useful
 * when you want to prevent accidentally converting primitives into Brands.
 */
export type Brand<T, B> = T & Branding<B>;

type Branding<B> = {
  _type: B;
};

/**
 * Converts an object of type `T` to a Brand of type `T`.
 *
 * Note that this method can rebrand objects, as seen in the following example:
 *
 * ```ts
 * type Foo = typesafety.Brand<number, "foo">;
 * type Bar = typesafety.Brand<number, "bar">;
 *
 * const foo: Foo = stampBrand(100);
 *
 * // This compiles.
 * const bar: Bar = stampBrand(foo);
 *
 * // This does not.
 * const bar: Bar = foo;
 * ```
 * @param value The value to stamp as a brand.
 *
 * @returns The branded value.
 */
export const stampBrand = <T, B>(value: T): Brand<T, B> =>
  value as unknown as Brand<T, B>;
