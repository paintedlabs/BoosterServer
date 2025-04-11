"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stampBrand = void 0;
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
const stampBrand = (value) => value;
exports.stampBrand = stampBrand;
