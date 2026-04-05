/**
 * Logging Utility Tests
 * Unit tests for the structured logging system
 */
import {
  createLogger,
  createFileTransport,
  createHttpTransport,
  logger,
  LogLevel,
} from '@/lib/logging';

describe('Logging', () => {
  let consoleLogSpy: any;
  
  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with config', () => {
      const log = createLogger({
        service: 'test-service',
        environment: 'test',
        level: 'info',
      });
      
      expect(log).toBeDefined();
      expect(typeof log.info).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should include service and environment in logs', () => {
      const log = createLogger({
        service: 'my-service',
        environment: 'production',
        level: 'info',
      });
      
      log.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.service).toBe('my-service');
      expect(loggedData.environment).toBe('production');
    });
  });

  describe('log levels', () => {
    it('should log trace when level is trace', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'trace',
      });
      
      log.trace('Trace message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should not log trace when level is info', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.trace('Trace message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug when level is debug', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'debug',
      });
      
      log.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log info', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log warn', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.warn('Warning message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log error', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.error('Error message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log fatal', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.fatal('Fatal message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('context', () => {
    it('should include context in log entry', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('Message with context', { userId: '123', action: 'login' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      // userId is extracted to top level, action stays in context
      expect(loggedData.userId).toBe('123');
      expect(loggedData.context.action).toBe('login');
    });

    it('should extract requestId to top level', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('Request log', { requestId: 'req-123', data: 'test' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.requestId).toBe('req-123');
    });

    it('should extract userId to top level', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('User action', { userId: 'user-456' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.userId).toBe('user-456');
    });

    it('should extract duration to top level', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('Operation completed', { duration: 150 });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.duration).toBe(150);
    });
  });

  describe('error logging', () => {
    it('should include error details', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      const error = new Error('Test error');
      log.error('An error occurred', error);
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.error).toBeDefined();
      expect(loggedData.error.name).toBe('Error');
      expect(loggedData.error.message).toBe('Test error');
      expect(loggedData.error.stack).toBeDefined();
    });

    it('should handle error as context object', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.error('Error with context', { code: 500, details: 'Something went wrong' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.context.code).toBe(500);
    });
  });

  describe('redaction', () => {
    it('should redact sensitive keys', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('Login attempt', { 
        email: 'test@example.com',
        password: 'secret123',
      });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.context.password).toBe('[REDACTED]');
      expect(loggedData.context.email).toBe('test@example.com');
    });

    it('should redact token fields', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('API call', { 
        apiKey: 'test_key_REDACTED_VALUE_12345',
        token: 'jwt_token_here',
      });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.context.apiKey).toBe('[REDACTED]');
      expect(loggedData.context.token).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      log.info('Nested data', { 
        user: {
          name: 'John',
          authorization: 'Bearer abc123',
        },
      });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.context.user.authorization).toBe('[REDACTED]');
      expect(loggedData.context.user.name).toBe('John');
    });

    it('should use custom redact paths', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
        redactPaths: ['customSecret'],
      });
      
      log.info('Custom secret', { 
        customSecret: 'super-secret',
        normalField: 'visible',
      });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.context.customSecret).toBe('[REDACTED]');
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      const childLog = log.child({ requestId: 'req-789' });
      childLog.info('Child log message', { extra: 'data' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.requestId).toBe('req-789');
      expect(loggedData.context.extra).toBe('data');
    });

    it('should preserve parent context', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      const childLog = log.child({ userId: 'user-123' });
      childLog.info('Action', { action: 'click' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.userId).toBe('user-123');
      expect(loggedData.context.action).toBe('click');
    });
  });

  describe('time', () => {
    it('should time async operations', async () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      const result = await log.time('database query', async () => {
        await new Promise(r => setTimeout(r, 10));
        return { data: 'result' };
      });
      
      expect(result).toEqual({ data: 'result' });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.message).toContain('database query completed');
      expect(loggedData.duration).toBeGreaterThanOrEqual(10);
    });

    it('should log errors from timed operations', async () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
      });
      
      await expect(log.time('failing operation', async () => {
        throw new Error('Operation failed');
      })).rejects.toThrow('Operation failed');
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.message).toContain('failing operation failed');
      expect(loggedData.error).toBeDefined();
    });
  });

  describe('pretty printing', () => {
    it('should pretty print when enabled', () => {
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
        pretty: true,
      });
      
      log.info('Pretty message');
      
      // Should not be valid JSON when pretty printing
      expect(() => JSON.parse(consoleLogSpy.mock.calls[0][0])).toThrow();
    });
  });

  describe('transports', () => {
    it('should send logs to custom transports', () => {
      const customTransport = {
        name: 'custom',
        log: vi.fn(),
      };
      
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
        transports: [customTransport],
      });
      
      log.info('Transport test');
      
      expect(customTransport.log).toHaveBeenCalled();
    });

    it('should respect transport level filter', () => {
      const errorOnlyTransport = {
        name: 'error-only',
        level: 'error' as LogLevel,
        log: vi.fn(),
      };
      
      const log = createLogger({
        service: 'test',
        environment: 'test',
        level: 'info',
        transports: [errorOnlyTransport],
      });
      
      log.info('Info message');
      log.error('Error message');
      
      expect(errorOnlyTransport.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('createHttpTransport', () => {
    it('should create HTTP transport', () => {
      const transport = createHttpTransport('https://logs.example.com', {
        'X-API-Key': 'test-key',
      });
      
      expect(transport.name).toBe('http');
      expect(typeof transport.log).toBe('function');
    });
  });

  describe('default logger', () => {
    it('should export default logger', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });
});
