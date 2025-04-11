import * as typia from 'typia';

export * from 'typia';

export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assert<T>(input: unknown): T {
  return typia.assert<T>(input);
}

export function is<T>(input: unknown): input is T {
  return typia.is<T>(input);
}

export function validate<T>(input: unknown): typia.IValidation<T> {
  return typia.validate<T>(input);
}

export function createAssert<T>(): (input: unknown) => T {
  return typia.createAssert<T>();
}

export function createIs<T>(): (input: unknown) => input is T {
  return typia.createIs<T>();
}

export function createValidate<T>(): (input: unknown) => typia.IValidation<T> {
  return typia.createValidate<T>();
}

export function wrapValidate<T>(
  validator: (input: unknown) => typia.IValidation<T>
) {
  return (input: unknown): T => {
    const result = validator(input);
    if (!result.success) {
      throw new ValidationError(
        result.errors.map((e) => e.toString()).join('\n')
      );
    }
    return result.data;
  };
}

export function wrapValidateParse<T>(
  validator: (input: string) => typia.IValidation<T>
) {
  return (input: string): T => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new JsonParseError(
        `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    return wrapValidate((input: unknown) => validator(JSON.stringify(input)))(
      parsed
    );
  };
}
