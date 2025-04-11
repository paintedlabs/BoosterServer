# @core/time

The `@core/time` package contains generic utilities for manipulating @core/time and
scheduling @core/time-based workloads. In particular it defines a `Duration` type
which is otherwise missing from Javascript and is useful in a number of
behaviors exported by this package such as `sleep`, `doWithTimeout`, and
`doWithRetry`.

## Building

Run `nx build @core/time` to build the library.

## Running unit tests

Run `nx test @core/time` to execute the unit tests via [Jest](https://jestjs.io).
