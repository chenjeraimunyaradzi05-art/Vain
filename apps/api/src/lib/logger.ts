/**
 * Structured Logger with Context
 * 
 * Production-ready logging with structured output, log levels,
 * and context propagation.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Log level priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Configuration
const config = {
  minLevel: (process.env.LOG_LEVEL || 'info') as LogLevel,
  jsonOutput: process.env.NODE_ENV === 'production',
  colorize: process.env.NODE_ENV !== 'production',
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

/**
 * Format log entry for console output
 */
function formatConsole(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;
  
  if (config.jsonOutput) {
    return JSON.stringify(entry);
  }

  const color = config.colorize ? colors[level] : '';
  const reset = config.colorize ? colors.reset : '';
  const dim = config.colorize ? colors.dim : '';

  let output = `${dim}${timestamp}${reset} ${color}${level.toUpperCase().padEnd(5)}${reset} ${message}`;

  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');
    output += ` ${dim}${contextStr}${reset}`;
  }

  if (error) {
    output += `\n${color}${error.name}: ${error.message}${reset}`;
    if (error.stack) {
      output += `\n${dim}${error.stack}${reset}`;
    }
  }

  return output;
}

/**
 * Write log entry
 */
function write(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  // Check log level
  if (LOG_LEVELS[level] < LOG_LEVELS[config.minLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  const output = formatConsole(entry);

  // Use appropriate console method
  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Logger interface
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    write('debug', message, context);
  },

  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },

  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },

  error(message: string, context?: LogContext | Error, error?: Error): void {
    if (context instanceof Error) {
      write('error', message, undefined, context);
    } else {
      write('error', message, context, error);
    }
  },

  /**
   * Create a child logger with preset context
   */
  child(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) => 
        write('debug', message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) => 
        write('info', message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) => 
        write('warn', message, { ...baseContext, ...context }),
      error: (message: string, context?: LogContext | Error, error?: Error) => {
        if (context instanceof Error) {
          write('error', message, baseContext, context);
        } else {
          write('error', message, { ...baseContext, ...context }, error);
        }
      },
    };
  },

  /**
   * HTTP request logging middleware
   */
  httpLogger() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const requestId = req.requestId || req.headers['x-request-id'];

      // Log on response finish
      res.on('finish', () => {
        const duration = Date.now() - start;
        const context: LogContext = {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userId: req.user?.id,
        };

        if (res.statusCode >= 500) {
          logger.error('Request failed', context);
        } else if (res.statusCode >= 400) {
          logger.warn('Client error', context);
        } else {
          logger.info('Request completed', context);
        }
      });

      next();
    };
  },
};

export default logger;

export {};
