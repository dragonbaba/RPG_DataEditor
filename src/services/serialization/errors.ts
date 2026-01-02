/**
 * Serialization Error Handling
 * 
 * Provides comprehensive error handling for JSON serialization operations
 * including error capture, position locating, and user-friendly messages.
 * 
 * Requirements: 11.3
 */

import type { SerializationError, SerializationErrorCode, ErrorPosition } from './types';

/**
 * Custom error class for serialization errors
 */
export class JSONSerializationError extends Error {
  readonly code: SerializationErrorCode;
  readonly position?: ErrorPosition;
  readonly details?: string;
  readonly originalError?: Error;

  constructor(
    message: string,
    code: SerializationErrorCode,
    options?: {
      position?: ErrorPosition;
      details?: string;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'JSONSerializationError';
    this.code = code;
    this.position = options?.position;
    this.details = options?.details;
    this.originalError = options?.originalError;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JSONSerializationError);
    }
  }

  /**
   * Convert to SerializationError object
   */
  toSerializationError(): SerializationError {
    return {
      message: this.message,
      code: this.code,
      position: this.position,
      details: this.details,
    };
  }
}

/**
 * Error position parser for various JSON error formats
 */
export class ErrorPositionParser {
  /**
   * Parse error position from a SyntaxError
   */
  static fromSyntaxError(error: SyntaxError, input: string): ErrorPosition | undefined {
    // Try multiple patterns to extract position
    const patterns = [
      // "at position X"
      /position\s+(\d+)/i,
      // "at line X column Y"
      /line\s+(\d+)\s+column\s+(\d+)/i,
      // "at line X"
      /line\s+(\d+)/i,
      // JSON.parse error format: "... at position X"
      /at\s+position\s+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = error.message.match(pattern);
      if (match) {
        if (match.length === 3) {
          // Line and column format
          const line = parseInt(match[1], 10);
          const column = parseInt(match[2], 10);
          return {
            line,
            column,
            offset: this.lineColumnToOffset(input, line, column),
          };
        } else if (match.length === 2) {
          // Position or line only format
          const value = parseInt(match[1], 10);
          // Check if it's likely a position (offset) or line number
          if (pattern.source.includes('position')) {
            const { line, column } = this.offsetToLineColumn(input, value);
            return { line, column, offset: value };
          } else {
            // Line only - assume column 1
            return {
              line: value,
              column: 1,
              offset: this.lineColumnToOffset(input, value, 1),
            };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Convert character offset to line and column
   */
  static offsetToLineColumn(input: string, offset: number): { line: number; column: number } {
    const safeOffset = Math.min(offset, input.length);
    const substring = input.substring(0, safeOffset);
    const lines = substring.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  /**
   * Convert line and column to character offset
   */
  static lineColumnToOffset(input: string, line: number, column: number): number {
    const lines = input.split('\n');
    let offset = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline character
    }
    return offset + Math.max(0, column - 1);
  }

  /**
   * Get context snippet around error position
   */
  static getContextSnippet(
    input: string,
    position: ErrorPosition,
    contextLines = 2
  ): string {
    const lines = input.split('\n');
    const errorLine = position.line - 1;
    const startLine = Math.max(0, errorLine - contextLines);
    const endLine = Math.min(lines.length - 1, errorLine + contextLines);

    const snippetLines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const lineNum = (i + 1).toString().padStart(4, ' ');
      const marker = i === errorLine ? '>>>' : '   ';
      snippetLines.push(`${marker} ${lineNum} | ${lines[i]}`);

      // Add pointer line for error position
      if (i === errorLine) {
        const pointer = ' '.repeat(position.column + 7) + '^';
        snippetLines.push(`    ${' '.repeat(lineNum.length)} | ${pointer}`);
      }
    }

    return snippetLines.join('\n');
  }
}

/**
 * User-friendly error message generator
 */
export class ErrorMessageGenerator {
  private static readonly ERROR_MESSAGES: Record<SerializationErrorCode, string> = {
    PARSE_ERROR: 'JSON解析错误',
    VALIDATION_ERROR: '数据验证失败',
    SERIALIZATION_ERROR: '序列化失败',
    INVALID_INPUT: '无效输入',
    CIRCULAR_REFERENCE: '检测到循环引用',
    UNKNOWN_ERROR: '未知错误',
  };

  private static readonly PARSE_ERROR_HINTS: Array<{ pattern: RegExp; hint: string }> = [
    { pattern: /unexpected token/i, hint: '检查是否有多余或缺少的逗号、引号或括号' },
    { pattern: /unexpected end/i, hint: 'JSON不完整，检查是否缺少闭合括号或引号' },
    { pattern: /unexpected string/i, hint: '字符串位置不正确，检查是否缺少逗号' },
    { pattern: /unexpected number/i, hint: '数字位置不正确，检查是否缺少逗号或引号' },
    { pattern: /expected.*after/i, hint: '语法错误，检查前一个元素的格式' },
    { pattern: /bad control character/i, hint: '字符串中包含无效的控制字符' },
    { pattern: /bad string/i, hint: '字符串格式错误，检查转义字符' },
  ];

  /**
   * Generate user-friendly error message
   */
  static generate(
    code: SerializationErrorCode,
    originalMessage: string,
    position?: ErrorPosition
  ): string {
    const baseMessage = this.ERROR_MESSAGES[code] || '未知错误';
    const positionInfo = position
      ? ` (第 ${position.line} 行, 第 ${position.column} 列)`
      : '';

    let message = `${baseMessage}${positionInfo}`;

    // Add hint for parse errors
    if (code === 'PARSE_ERROR') {
      const hint = this.getParseErrorHint(originalMessage);
      if (hint) {
        message += `\n提示: ${hint}`;
      }
    }

    return message;
  }

  /**
   * Get hint for parse error
   */
  private static getParseErrorHint(errorMessage: string): string | undefined {
    for (const { pattern, hint } of this.PARSE_ERROR_HINTS) {
      if (pattern.test(errorMessage)) {
        return hint;
      }
    }
    return undefined;
  }

  /**
   * Generate detailed error report
   */
  static generateDetailedReport(
    error: SerializationError,
    input?: string
  ): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      `错误类型: ${error.code}`,
      `错误信息: ${error.message}`,
    ];

    if (error.position) {
      lines.push(`位置: 第 ${error.position.line} 行, 第 ${error.position.column} 列 (偏移: ${error.position.offset})`);
    }

    if (error.details) {
      lines.push('', '详细信息:', error.details);
    }

    if (input && error.position) {
      lines.push('', '上下文:', ErrorPositionParser.getContextSnippet(input, error.position));
    }

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

/**
 * Error handler for serialization operations
 */
export class SerializationErrorHandler {
  /**
   * Handle and transform errors from JSON operations
   */
  static handle(error: unknown, input?: string): SerializationError {
    if (error instanceof JSONSerializationError) {
      return error.toSerializationError();
    }

    if (error instanceof SyntaxError) {
      const position = input
        ? ErrorPositionParser.fromSyntaxError(error, input)
        : undefined;

      return {
        code: 'PARSE_ERROR',
        message: ErrorMessageGenerator.generate('PARSE_ERROR', error.message, position),
        position,
        details: input && position
          ? ErrorPositionParser.getContextSnippet(input, position)
          : error.message,
      };
    }

    if (error instanceof TypeError) {
      const isCircular = error.message.includes('circular') || error.message.includes('cyclic');
      const code: SerializationErrorCode = isCircular ? 'CIRCULAR_REFERENCE' : 'SERIALIZATION_ERROR';

      return {
        code,
        message: ErrorMessageGenerator.generate(code, error.message),
        details: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: ErrorMessageGenerator.generate('UNKNOWN_ERROR', error.message),
        details: error.message,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: ErrorMessageGenerator.generate('UNKNOWN_ERROR', String(error)),
      details: String(error),
    };
  }

  /**
   * Create a validation error
   */
  static createValidationError(message: string, path?: string): SerializationError {
    return {
      code: 'VALIDATION_ERROR',
      message: ErrorMessageGenerator.generate('VALIDATION_ERROR', message),
      details: path ? `Path: ${path}\n${message}` : message,
    };
  }

  /**
   * Create an invalid input error
   */
  static createInvalidInputError(message: string): SerializationError {
    return {
      code: 'INVALID_INPUT',
      message: ErrorMessageGenerator.generate('INVALID_INPUT', message),
      details: message,
    };
  }
}
