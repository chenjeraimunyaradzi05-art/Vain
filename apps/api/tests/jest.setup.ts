import { jest } from '@jest/globals';

type ViLike = {
  fn: typeof jest.fn;
  mock: typeof jest.mock;
  spyOn: typeof jest.spyOn;
  mocked: <T>(item: T) => T;
  hoisted: <T>(factory: () => T) => T;
  useFakeTimers: typeof jest.useFakeTimers;
  useRealTimers: typeof jest.useRealTimers;
  advanceTimersByTime: typeof jest.advanceTimersByTime;
  advanceTimersByTimeAsync?: typeof jest.advanceTimersByTimeAsync;
  setSystemTime?: typeof jest.setSystemTime;
  clearAllMocks: typeof jest.clearAllMocks;
  resetAllMocks: typeof jest.resetAllMocks;
  restoreAllMocks: typeof jest.restoreAllMocks;
  stubEnv: (key: string, value: string) => void;
};

const viLike: ViLike = {
  fn: jest.fn,
  mock: jest.mock,
  spyOn: jest.spyOn,
  mocked: (item) => item,
  hoisted: (factory) => factory(),
  useFakeTimers: jest.useFakeTimers,
  useRealTimers: jest.useRealTimers,
  advanceTimersByTime: jest.advanceTimersByTime,
  advanceTimersByTimeAsync: (jest as any).advanceTimersByTimeAsync,
  setSystemTime: jest.setSystemTime,
  clearAllMocks: jest.clearAllMocks,
  resetAllMocks: jest.resetAllMocks,
  restoreAllMocks: jest.restoreAllMocks,
  stubEnv: (key: string, value: string) => {
    process.env[key] = value;
  },
};

(globalThis as any).vi = viLike;

expect.extend({
  toHaveBeenCalledOnce(received: jest.Mock) {
    const pass = received.mock.calls.length === 1;
    if (pass) {
      return {
        pass: true,
        message: () => 'expected mock not to have been called once',
      };
    }
    return {
      pass: false,
      message: () => `expected mock to have been called once, but was called ${received.mock.calls.length} times`,
    };
  },
});
