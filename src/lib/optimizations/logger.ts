// src/lib/optimizations/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  namespace: string;
  enabled: boolean;
  enabledLevels: LogLevel[];
}

export class Logger {
  private options: LoggerOptions;
  
  constructor(namespace: string, options: Partial<LoggerOptions> = {}) {
    this.options = {
      namespace,
      enabled: process.env.NODE_ENV !== 'production' || options.enabled || false,
      enabledLevels: options.enabledLevels || ['info', 'warn', 'error']
    };
  }
  
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }
  
  error(message: string | Error, ...args: unknown[]): void {
    if (message instanceof Error) {
      this.log('error', message.message, { stack: message.stack, ...args });
      return;
    }
    this.log('error', message, ...args);
  }
  
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }
  
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.options.enabled || !this.options.enabledLevels.includes(level)) {
      return;
    }
    
    const logFn = console[level] || console.log;
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.options.namespace}]`;
    
    logFn(`${prefix} ${message}`, ...args);
  }
}

// Factory para criar loggers com namespace específico
export function createLogger(namespace: string, options?: Partial<LoggerOptions>): Logger {
  return new Logger(namespace, options);
}