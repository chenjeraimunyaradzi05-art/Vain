/**
 * Logging Utilities
 * 
 * Structured logging with multiple transports and log levels.
 * Provides consistent logging across the application.
 */

// Log levels
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  requestId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  duration?: number;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  service: string;
  environment: string;
  pretty?: boolean;
  redactPaths?: string[];
  transports?: LogTransport[];
}

// Log transport interface
export interface LogTransport {
  name: string;
  level?: LogLevel;
  log: (entry: LogEntry) => void | Promise<void>;
}

// Redaction patterns
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'tfn',
];

const SENSITIVE_PATTERN = new RegExp(
  `(${SENSITIVE_KEYS.join('|')})`,
  'i'
);

/**
 * Redact sensitive values from an object
 */
function redact(obj: unknown, redactPaths: string[] = []): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redact(item, redactPaths));
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_PATTERN.test(key) || redactPaths.includes(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = redact(value, redactPaths);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  return obj;
}

/**
 * Format error for logging
 */
function formatError(error: Error): LogEntry['error'] {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

/**
 * Pretty print log entry for development
 */
function prettyPrint(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString();
  const levelColors: Record<LogLevel, string> = {
    trace: '\x1b[90m', // Gray
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    fatal: '\x1b[35m', // Magenta
  };
  const reset = '\x1b[0m';
  const color = levelColors[entry.level];
  
  let output = `${color}[${entry.level.toUpperCase().padEnd(5)}]${reset} ${timestamp} ${entry.message}`;
  
  if (entry.requestId) {
    output += ` [${entry.requestId}]`;
  }
  
  if (entry.duration !== undefined) {
    output += ` (${entry.duration}ms)`;
  }
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    output += `\n  ${JSON.stringify(entry.context, null, 2).replace(/\n/g, '\n  ')}`;
  }
  
  if (entry.error) {
    output += `\n  ${color}Error: ${entry.error.name}: ${entry.error.message}${reset}`;
    if (entry.error.stack) {
      output += `\n  ${entry.error.stack.split('\n').slice(1).join('\n  ')}`;
    }
  }
  
  return output;
}

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig) {
  const { service, environment, level, pretty = false, redactPaths = [], transports = [] } = config;
  const minLevel = LOG_LEVELS[level];
  
  function shouldLog(entryLevel: LogLevel): boolean {
    return LOG_LEVELS[entryLevel] >= minLevel;
  }
  
  function createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service,
      environment,
    };
    
    if (context) {
      entry.context = redact(context, redactPaths) as Record<string, unknown>;
      
      // Extract special fields
      if ('requestId' in context) {
        entry.requestId = context.requestId as string;
        delete entry.context.requestId;
      }
      if ('userId' in context) {
        entry.userId = context.userId as string;
        delete entry.context.userId;
      }
      if ('traceId' in context) {
        entry.traceId = context.traceId as string;
        delete entry.context.traceId;
      }
      if ('spanId' in context) {
        entry.spanId = context.spanId as string;
        delete entry.context.spanId;
      }
      if ('duration' in context) {
        entry.duration = context.duration as number;
        delete entry.context.duration;
      }
    }
    
    if (error) {
      entry.error = formatError(error);
    }
    
    return entry;
  }
  
  function log(entry: LogEntry): void {
    // Console output
    if (pretty) {
      console.log(prettyPrint(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
    
    // Send to transports
    for (const transport of transports) {
      const transportLevel = transport.level || level;
      if (LOG_LEVELS[entry.level] >= LOG_LEVELS[transportLevel]) {
        try {
          transport.log(entry);
        } catch (err) {
          console.error(`Error in transport ${transport.name}:`, err);
        }
      }
    }
  }
  
  return {
    trace(message: string, context?: Record<string, unknown>) {
      if (!shouldLog('trace')) return;
      log(createEntry('trace', message, context));
    },
    
    debug(message: string, context?: Record<string, unknown>) {
      if (!shouldLog('debug')) return;
      log(createEntry('debug', message, context));
    },
    
    info(message: string, context?: Record<string, unknown>) {
      if (!shouldLog('info')) return;
      log(createEntry('info', message, context));
    },
    
    warn(message: string, context?: Record<string, unknown>) {
      if (!shouldLog('warn')) return;
      log(createEntry('warn', message, context));
    },
    
    error(message: string, error?: Error | Record<string, unknown>, context?: Record<string, unknown>) {
      if (!shouldLog('error')) return;
      if (error instanceof Error) {
        log(createEntry('error', message, context, error));
      } else {
        log(createEntry('error', message, { ...error, ...context }));
      }
    },
    
    fatal(message: string, error?: Error | Record<string, unknown>, context?: Record<string, unknown>) {
      if (!shouldLog('fatal')) return;
      if (error instanceof Error) {
        log(createEntry('fatal', message, context, error));
      } else {
        log(createEntry('fatal', message, { ...error, ...context }));
      }
    },
    
    /**
     * Create a child logger with additional context
     */
    child(additionalContext: Record<string, unknown>) {
      return {
        trace: (message: string, context?: Record<string, unknown>) => {
          if (!shouldLog('trace')) return;
          log(createEntry('trace', message, { ...additionalContext, ...context }));
        },
        debug: (message: string, context?: Record<string, unknown>) => {
          if (!shouldLog('debug')) return;
          log(createEntry('debug', message, { ...additionalContext, ...context }));
        },
        info: (message: string, context?: Record<string, unknown>) => {
          if (!shouldLog('info')) return;
          log(createEntry('info', message, { ...additionalContext, ...context }));
        },
        warn: (message: string, context?: Record<string, unknown>) => {
          if (!shouldLog('warn')) return;
          log(createEntry('warn', message, { ...additionalContext, ...context }));
        },
        error: (message: string, error?: Error | Record<string, unknown>, context?: Record<string, unknown>) => {
          if (!shouldLog('error')) return;
          if (error instanceof Error) {
            log(createEntry('error', message, { ...additionalContext, ...context }, error));
          } else {
            log(createEntry('error', message, { ...additionalContext, ...error, ...context }));
          }
        },
        fatal: (message: string, error?: Error | Record<string, unknown>, context?: Record<string, unknown>) => {
          if (!shouldLog('fatal')) return;
          if (error instanceof Error) {
            log(createEntry('fatal', message, { ...additionalContext, ...context }, error));
          } else {
            log(createEntry('fatal', message, { ...additionalContext, ...error, ...context }));
          }
        },
      };
    },
    
    /**
     * Time an async operation
     */
    async time<T>(label: string, fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        this.info(`${label} completed`, { ...context, duration });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.error(`${label} failed`, error as Error, { ...context, duration });
        throw error;
      }
    },
  };
}

/**
 * File transport for logging to files
 */
export function createFileTransport(filepath: string): LogTransport {
  const fs = require('fs');
  const stream = fs.createWriteStream(filepath, { flags: 'a' });
  
  return {
    name: 'file',
    log(entry: LogEntry) {
      stream.write(JSON.stringify(entry) + '\n');
    },
  };
}

/**
 * HTTP transport for logging to external services
 */
export function createHttpTransport(url: string, headers?: Record<string, string>): LogTransport {
  const buffer: LogEntry[] = [];
  let flushTimeout: NodeJS.Timeout | null = null;
  
  async function flush() {
    if (buffer.length === 0) return;
    
    const entries = buffer.splice(0, buffer.length);
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(entries),
      });
    } catch (error) {
      // Put entries back in buffer on failure
      buffer.unshift(...entries);
      console.error('Failed to flush logs:', error);
    }
  }
  
  return {
    name: 'http',
    log(entry: LogEntry) {
      buffer.push(entry);
      
      // Flush immediately on error/fatal
      if (entry.level === 'error' || entry.level === 'fatal') {
        flush();
        return;
      }
      
      // Otherwise batch and flush after delay
      if (!flushTimeout) {
        flushTimeout = setTimeout(() => {
          flushTimeout = null;
          flush();
        }, 5000);
      }
    },
  };
}

/**
 * Create default application logger
 */
export const logger = createLogger({
  service: 'ngurra-api',
  environment: process.env.NODE_ENV || 'development',
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  pretty: process.env.NODE_ENV !== 'production',
});

export default logger;

export {};
