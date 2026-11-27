type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type SuiteFn = (name: string, fn: () => void) => void;

const h = (globalThis as unknown as {
  __TEST_HARNESS__: {
    describe: SuiteFn;
    it: TestFn;
    assert: typeof import('node:assert/strict');
  };
}).__TEST_HARNESS__;

export const describe = h.describe;
export const it = h.it;
export const assert = h.assert;
