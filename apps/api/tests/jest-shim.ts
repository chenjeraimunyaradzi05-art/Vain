// Jest compatibility shim for Vitest
// Some legacy unit tests use the `jest` global; map it to Vitest's `vi`.
// This file is loaded by Vitest via `setupFiles`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny: any = globalThis as any;

if (!globalAny.jest) {
  globalAny.jest = globalAny.vi;

  // Keep track of explicit mock factories so `jest.requireMock` can return them synchronously
  const jestFactoryMap = new Map<string, Function>();
  const originalJestMock = globalAny.jest.mock.bind(globalAny.jest);

  // Override `jest.mock` to capture factory values and register them with Vitest.
  // If a factory function is provided, invoke it immediately and store the returned mock
  // object so `jest.requireMock` can synchronously return the same identity that tests expect.
  globalAny.jest.mock = (modulePath: string, factory?: any, options?: any) => {
    if (typeof factory === 'function') {
      // Only invoke the factory immediately if it does not expect an `importOriginal` argument
      // (factory.length === 0) and is not async. Async factories and factories that expect
      // an importOriginal function must be registered with Vitest as-is so Vitest can call
      // them with the correct arguments.
      const isAsync = factory.constructor && factory.constructor.name === 'AsyncFunction';
      if (factory.length === 0 && !isAsync) {
        try {
          const mockValue = factory();
          jestFactoryMap.set(modulePath, mockValue);

          // Debug log: indicate we executed the factory and stored the mock
          // eslint-disable-next-line no-console
          console.log('jest-shim: executed jest.mock factory for', modulePath);

          // Also set the global prisma mock so modules that read global.__PRISMA_MOCK during
          // initialization will pick up the mocked client immediately. This helps bridge the
          // timing gap when imports are hoisted and `jest.mock` is transformed differently.
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__PRISMA_MOCK = (mockValue as any).prisma ?? null;
            // eslint-disable-next-line no-console
            console.log('jest-shim: set __PRISMA_MOCK from factory for', modulePath, '->', !!(globalThis as any).__PRISMA_MOCK);
          }
          catch (e) {
            // ignore
          }

          // If the real DB module is available, inject the mocked prisma into it *before*
          // we register the module mock so that any already-imported modules that use
          // the real `prisma` proxy will pick up the mocked implementation.
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const realDb = require('../src/db');
            if (realDb && typeof realDb.__setPrismaForTests === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (realDb as any).__setPrismaForTests((mockValue as any).prisma ?? null);
              // eslint-disable-next-line no-console
              console.log('jest-shim: injected mocked prisma into real DB module for', modulePath);
            }
          }
          catch (e) {
            // ignore if the real module cannot be required here
            // eslint-disable-next-line no-console
            console.log('jest-shim: failed to inject mocked prisma into real DB for', modulePath, '-', (e && e.message) || e);
          }

          // Register the resolved mock with Vitest so imports use the mocked module.
          return originalJestMock(modulePath, () => mockValue, options);
        }
        catch (e) {
          // Fall back to storing the factory and registering it as-is
          jestFactoryMap.set(modulePath, factory);
          return originalJestMock(modulePath, factory, options);
        }
      }

      // For async factories or factories expecting importOriginal, just register them and
      // store the factory function so jest.requireMock can at least provide a fallback.
      jestFactoryMap.set(modulePath, factory);
      return originalJestMock(modulePath, factory, options);
    }

    if (factory !== undefined) {
      // If factory is an object value (jest.mock('mod', { ... })), store and register it
      jestFactoryMap.set(modulePath, factory);
      const res = originalJestMock(modulePath, () => factory, options);
      // Try to inject into already loaded module
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(modulePath);
        if (loaded && typeof loaded.__setPrismaForTests === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (loaded as any).__setPrismaForTests((factory as any).prisma ?? null);
        }
      }
      catch (e) {
        // ignore
      }
      return res;
    }

    return originalJestMock(modulePath, factory, options);
  };

  // Provide a synchronous requireMock compatible with Jest's API used by legacy tests.
  // If a factory was registered via `jest.mock(modulePath, () => {...})`, call it and return the value.
  // Otherwise, try Node's require (Vitest will intercept require calls for mocks too).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalAny.jest.requireMock = (modulePath: string): any => {
    if (jestFactoryMap.has(modulePath)) {
      const val = jestFactoryMap.get(modulePath)!;
      if (typeof val === 'function') {
        try {
          return val();
        }
        catch (e) {
          return {};
        }
      }
      return val;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(modulePath);
    }
    catch (e) {
      return {};
    }
  };
}

// Attempt to inject the canonical Prisma mock into the shared DB module early so that
// tests that access `prisma` without explicitly mocking the module do not hit a real
// database. This helps when integration tests or other files initialize Prisma first.
try {
  // eslint-disable-next-line no-console
  console.log('jest-shim: attempting to load prisma mock (sync require)');

  // Only set a global prisma mock when running unit tests under `src/`.
  // Avoid setting this for full integration test runs (which operate under `tests/`)
  // because integration tests expect a real Prisma client and possible DB connectivity.
  const argvStr = (process.argv || []).join(' ');
  const looksLikeUnitRun = /\b(src|tests[\\/]unit)[\\/].*\.test\.(ts|js)\b/i.test(argvStr) || (/\.test\.(ts|js)\b/i.test(argvStr) && (argvStr.includes('src') || argvStr.includes('tests')));

  if (!process.env.DATABASE_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prismaMock } = require('../src/test/mocks/prisma');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__PRISMA_MOCK = prismaMock;
      // eslint-disable-next-line no-console
      console.log('jest-shim: __PRISMA_MOCK set (sync require)?', !!(globalThis as any).__PRISMA_MOCK);
    }
    catch (e) {
      // Fall back to dynamic import which Vitest can handle in ESM contexts
      // eslint-disable-next-line no-console
      console.log('jest-shim: sync require failed, trying dynamic import');
      // eslint-disable-next-line no-console
      console.log('jest-shim: sync require error:', (e && e.message) || e);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      import('../src/test/mocks/prisma').then((mod) => {
        // Only set a canonical mock if a per-file mock hasn't already set __PRISMA_MOCK
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(globalThis as any).__PRISMA_MOCK) {
          (globalThis as any).__PRISMA_MOCK = (mod as any).prismaMock;
          // eslint-disable-next-line no-console
          console.log('jest-shim: __PRISMA_MOCK set (dynamic import)?', !!(globalAny as any).__PRISMA_MOCK);
        } else {
          // eslint-disable-next-line no-console
          console.log('jest-shim: dynamic import skipped because __PRISMA_MOCK already set by test-specific mock');
        }
      }).catch(() => {
        // ignore
      });
    }
  }
  else {
    // eslint-disable-next-line no-console
    console.log('jest-shim: DATABASE_URL present – skipping global prisma mock');
  }

  // Historically we registered a module-level default mock here to protect unit tests
  // from accidentally hitting a real DB. However, that mock interfered with per-file
  // `vi.mock('../db', ...)` overrides and caused tests to see incorrect mock shapes.
  // To preserve per-file mock semantics and rely on the canonical `prismaMock` or the
  // test-friendly deep-proxy inside `src/db.ts`, we no longer register a module mock.
  // Integration tests that expect a real DB should set `DATABASE_URL` and unit tests
  // can continue to vi.mock('../../src/db', ...) or rely on the exported `prismaMock`.
  // eslint-disable-next-line no-console
  console.log('jest-shim: skipping registration of lazy module-level DB mock to avoid overriding per-file mocks');

}
catch (e) {
  // Ignore if mocks are not present or require fails in some environments
}

export {};
