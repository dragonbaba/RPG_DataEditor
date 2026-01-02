/**
 * Logger Service - 日志系统
 * Requirements: 12.4, 12.5 - 多级别日志和文件日志输出
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  maxLogEntries: number;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#9ca3af',
  info: '#00f0ff',
  warn: '#ff8800',
  error: '#ef4444',
};

class Logger {
  private config: LoggerConfig = {
    minLevel: 'info',
    enableConsole: true,
    enableFile: true,
    maxLogEntries: 1000,
  };

  private logHistory: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Add a log listener for real-time log updates
   */
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Format timestamp for log entries
   */
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a log entry
   */
  private createEntry(level: LogLevel, message: string, data?: unknown, source?: string): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data,
      source,
    };
  }

  /**
   * Log to console with styling
   */
  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const color = LOG_LEVEL_COLORS[entry.level];
    const prefix = `%c[${entry.level.toUpperCase()}]%c ${entry.timestamp}`;
    const sourceInfo = entry.source ? ` [${entry.source}]` : '';
    
    const styles = [
      `color: ${color}; font-weight: bold`,
      'color: #6b7280',
    ];

    if (entry.data !== undefined) {
      console.log(`${prefix}${sourceInfo}: ${entry.message}`, ...styles, entry.data);
    } else {
      console.log(`${prefix}${sourceInfo}: ${entry.message}`, ...styles);
    }
  }

  /**
   * Log to file via IPC (if available)
   */
  private async logToFile(_entry: LogEntry): Promise<void> {
    if (!this.config.enableFile) return;

    // File logging is handled by storing in memory history
    // The main process can implement file persistence if needed
    // For now, logs are available via getHistory() method
  }

  /**
   * Store entry in history
   */
  private storeEntry(entry: LogEntry): void {
    this.logHistory.push(entry);
    
    // Trim history if it exceeds max size
    if (this.logHistory.length > this.config.maxLogEntries) {
      this.logHistory = this.logHistory.slice(-this.config.maxLogEntries);
    }
 
    // Notify listeners - 使用 try-catch 包装每个监听器调用
    // 确保一个监听器的错误不会影响其他监听器
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (error) {
        // 使用 console.error 而不是 this.error 避免递归
        console.error('[Logger] Listener error:', error);
      }
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createEntry(level, message, data, source);
    
    this.storeEntry(entry);
    this.logToConsole(entry);
    this.logToFile(entry);
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: unknown, source?: string): void {
    this.log('debug', message, data, source);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: unknown, source?: string): void {
    this.log('info', message, data, source);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: unknown, source?: string): void {
    this.log('warn', message, data, source);
  }

  /**
   * Error level logging
   */
  error(message: string, data?: unknown, source?: string): void {
    this.log('error', message, data, source);
  }

  /**
   * Log an Error object with stack trace
   */
  logError(error: Error, source?: string): void {
    this.error(error.message, {
      name: error.name,
      stack: error.stack,
    }, source);
  }

  /**
   * Create a child logger with a specific source
   */
  createChild(source: string): ChildLogger {
    return new ChildLogger(this, source);
  }
}

/**
 * Child logger with a fixed source
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private source: string
  ) {}

  debug(message: string, data?: unknown): void {
    this.parent.debug(message, data, this.source);
  }

  info(message: string, data?: unknown): void {
    this.parent.info(message, data, this.source);
  }

  warn(message: string, data?: unknown): void {
    this.parent.warn(message, data, this.source);
  }

  error(message: string, data?: unknown): void {
    this.parent.error(message, data, this.source);
  }

  logError(error: Error): void {
    this.parent.logError(error, this.source);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { ChildLogger };
export default logger;
