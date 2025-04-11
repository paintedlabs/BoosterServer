/**
 * Flavoring is a technique to differentiate types with the same shape. For
 * example, if both my `Person` and my `BlogPost` have a numeric ID, I’d really
 * like to communicate to TypeScript that they’re not interchangeable. But a
 * function that takes a number accepts both kinds of values.
 *
 * Flavoring solves this issue with "nominal typing". We extend types with
 * additional information that's only available at compile time which causes
 * compilation errors when like-types are accidentally interchanged.
 *
 * ## Example
 *
 * ```ts
 * type PersonId = Flavor<number, “Person”>
 * type BlogPostId = Flavor<number, “BlogPost”>
 *
 * const personId: PersonId = 1; // OK
 * const person: Person = personLikeStructure // OK
 *
 * const blogPostId: BlogPostId = personId; // Error!
 * ```
 *
 * @see https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
 */
export type Flavor<T, F> = T & Flavoring<F>;

type Flavoring<F> = {
  // It's important that this type is optional so that implicit casting from an
  // non-flavored type into a flavored type can occur. Otherwise code like the
  // following would not compile:
  //
  // ```ts
  // type PersonId = Flavor<number, “Person”>
  //
  // const personId: PersonId = 1;
  // ```
  //
  // If this behavior is desired, see `Brand.ts`.
  _type?: F;
};
