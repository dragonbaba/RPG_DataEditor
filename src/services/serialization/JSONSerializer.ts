/**
 * JSONSerializer
 * 
 * Provides JSON serialization and deserialization with error handling,
 * validation, and pretty-print support.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type {
  SerializationResult,
  SerializationError,
  SerializationErrorCode,
  ErrorPosition,
  SerializeOptions,
  DeserializeOptions,
  ValidationResult,
  ValidationError,
} from './types';

/**
 * Default serialization options
 */
const DEFAULT_SERIALIZE_OPTIONS: Required<SerializeOptions> = {
  pretty: true,
  indent: 2,
  sortKeys: false,
};

/**
 * Parse a JSON syntax error to extract position information
 */
function parseErrorPosition(error: SyntaxError, input: string): ErrorPosition | undefined {
  // Try to extract position from error message
  // Common formats: "at position X", "at line X column Y"
  const positionMatch = error.message.match(/position\s+(\d+)/i);
  const lineColMatch = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

  if (lineColMatch) {
    return {
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
      offset: calculateOffset(input, parseInt(lineColMatch[1], 10), parseInt(lineColMatch[2], 10)),
    };
  }

  if (positionMatch) {
    const offset = parseInt(positionMatch[1], 10);
    const { line, column } = offsetToLineColumn(input, offset);
    return { line, column, offset };
  }

  return undefined;
}

/**
 * Convert line/column to character offset
 */
function calculateOffset(input: string, line: number, column: number): number {
  const lines = input.split('\n');
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  return offset + column - 1;
}

/**
 * Convert character offset to line/column
 */
function offsetToLineColumn(input: string, offset: number): { line: number; column: number } {
  const substring = input.substring(0, offset);
  const lines = substring.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Create a user-friendly error message
 */
function createUserFriendlyMessage(
  code: SerializationErrorCode,
  originalMessage: string,
  position?: ErrorPosition
): string {
  const positionInfo = position 
    ? ` at line ${position.line}, column ${position.column}` 
    : '';

  switch (code) {
    case 'PARSE_ERROR':
      return `JSON解析错误${positionInfo}: ${simplifyParseError(originalMessage)}`;
    case 'VALIDATION_ERROR':
      return `数据验证失败: ${originalMessage}`;
    case 'SERIALIZATION_ERROR':
      return `序列化失败: ${originalMessage}`;
    case 'INVALID_INPUT':
      return `无效输入: ${originalMessage}`;
    case 'CIRCULAR_REFERENCE':
      return '序列化失败: 检测到循环引用';
    default:
      return `未知错误: ${originalMessage}`;
  }
}

/**
 * Simplify JSON parse error messages for users
 */
function simplifyParseError(message: string): string {
  if (message.includes('Unexpected token')) {
    return '意外的字符';
  }
  if (message.includes('Unexpected end')) {
    return 'JSON不完整';
  }
  if (message.includes('Unexpected string')) {
    return '字符串格式错误';
  }
  if (message.includes('Unexpected number')) {
    return '数字格式错误';
  }
  return message;
}

/**
 * Sort object keys recursively
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Check if an error is a circular reference error
 */
function isCircularReferenceError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('circular') || error.message.includes('cyclic');
  }
  return false;
}

/**
 * JSONSerializer class
 * Provides type-safe JSON serialization with comprehensive error handling
 */
export class JSONSerializer {
  /**
   * Serialize data to JSON string
   * @param data - Data to serialize
   * @param options - Serialization options
   * @returns Serialization result with JSON string or error
   */
  serialize<T>(data: T, options: SerializeOptions = {}): SerializationResult<string> {
    const opts = { ...DEFAULT_SERIALIZE_OPTIONS, ...options };

    try {
      // Handle undefined input
      if (data === undefined) {
        return this.createError('INVALID_INPUT', 'Cannot serialize undefined');
      }

      // Sort keys if requested
      const processedData = opts.sortKeys ? sortObjectKeys(data) : data;

      // Serialize with or without pretty printing
      const json = opts.pretty
        ? JSON.stringify(processedData, null, opts.indent)
        : JSON.stringify(processedData);

      return { success: true, data: json };
    } catch (error) {
      if (isCircularReferenceError(error)) {
        return this.createError('CIRCULAR_REFERENCE', 'Circular reference detected');
      }

      const message = error instanceof Error ? error.message : 'Unknown serialization error';
      return this.createError('SERIALIZATION_ERROR', message);
    }
  }

  /**
   * Deserialize JSON string to data
   * @param json - JSON string to parse
   * @param options - Deserialization options
   * @returns Deserialization result with parsed data or error
   */
  deserialize<T>(json: string, options: DeserializeOptions = {}): SerializationResult<T> {
    try {
      // Handle empty input
      if (!json || json.trim() === '') {
        return this.createError('INVALID_INPUT', 'Empty JSON string');
      }

      // Parse JSON
      const data = JSON.parse(json, options.reviver) as T;

      // Validate if validator provided
      if (options.validate && !options.validate(data)) {
        return this.createError('VALIDATION_ERROR', 'Data validation failed');
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const position = parseErrorPosition(error, json);
        return this.createError('PARSE_ERROR', error.message, position, json);
      }

      const message = error instanceof Error ? error.message : 'Unknown parse error';
      return this.createError('UNKNOWN_ERROR', message);
    }
  }

  /**
   * Validate JSON string without fully parsing
   * @param json - JSON string to validate
   * @returns Validation result
   */
  validate(json: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!json || json.trim() === '') {
      errors.push({ path: '', message: 'Empty JSON string' });
      return { valid: false, errors };
    }

    try {
      JSON.parse(json);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const position = parseErrorPosition(error, json);
        const positionInfo = position 
          ? ` (line ${position.line}, column ${position.column})` 
          : '';
        errors.push({
          path: positionInfo,
          message: simplifyParseError(error.message),
        });
      } else {
        errors.push({
          path: '',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      return { valid: false, errors };
    }
  }

  /**
   * Pretty print JSON string
   * @param json - JSON string to format
   * @param indent - Indentation spaces (default: 2)
   * @returns Formatted JSON or error
   */
  prettyPrint(json: string, indent = 2): SerializationResult<string> {
    const parseResult = this.deserialize<unknown>(json);
    if (!parseResult.success) {
      return parseResult as SerializationResult<string>;
    }

    return this.serialize(parseResult.data, { pretty: true, indent });
  }

  /**
   * Minify JSON string
   * @param json - JSON string to minify
   * @returns Minified JSON or error
   */
  minify(json: string): SerializationResult<string> {
    const parseResult = this.deserialize<unknown>(json);
    if (!parseResult.success) {
      return parseResult as SerializationResult<string>;
    }

    return this.serialize(parseResult.data, { pretty: false });
  }

  /**
   * Create an error result
   */
  private createError(
    code: SerializationErrorCode,
    originalMessage: string,
    position?: ErrorPosition,
    input?: string
  ): SerializationResult<never> {
    const error: SerializationError = {
      code,
      message: createUserFriendlyMessage(code, originalMessage, position),
      position,
      details: originalMessage,
    };

    // Add context snippet for parse errors
    if (position && input) {
      const lines = input.split('\n');
      const errorLine = lines[position.line - 1];
      if (errorLine) {
        error.details = `${originalMessage}\n>>> ${errorLine}\n>>> ${' '.repeat(position.column - 1)}^`;
      }
    }

    return { success: false, error };
  }
}

// Export singleton instance
export const jsonSerializer = new JSONSerializer();

export default jsonSerializer;
