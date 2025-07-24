/**
 * Shared logger utility for CoachMeld monorepo
 * Provides environment-aware logging with consistent interface
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | unknown, context?: LogContext): void;
}

class ConsoleLogger implements Logger {
  private logLevel: LogLevel;
  private prefix: string;

  constructor(prefix: string = '', logLevel?: LogLevel) {
    // Default log levels based on environment
    if (logLevel !== undefined) {
      this.logLevel = logLevel;
    } else if (process.env.NODE_ENV === 'production') {
      this.logLevel = LogLevel.WARN;
    } else if (process.env.NODE_ENV === 'test') {
      this.logLevel = LogLevel.ERROR;
    } else {
      this.logLevel = LogLevel.DEBUG;
    }
    
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    return `${timestamp} [${level}] ${prefix}${message}`;
  }

  private formatContext(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    return ' ' + JSON.stringify(context);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message) + this.formatContext(context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message) + this.formatContext(context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message) + this.formatContext(context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      
      console.error(
        this.formatMessage('ERROR', message) + 
        this.formatContext({ ...context, error: errorDetails })
      );
    }
  }
}

/**
 * Create a logger instance with optional prefix
 * @param prefix - Optional prefix for all log messages (e.g., component name)
 * @param logLevel - Optional log level override
 */
export function createLogger(prefix?: string, logLevel?: LogLevel): Logger {
  return new ConsoleLogger(prefix, logLevel);
}

// Default logger instance
export const logger = createLogger();

// Re-export for convenience
export default logger;