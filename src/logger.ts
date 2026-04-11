const noop = (..._args: unknown[]): void => {};

export const logger = {
  info: noop,
  debug: noop,
  error: console.error,
};
