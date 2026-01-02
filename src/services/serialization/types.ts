/**
 * Serialization Types
 * 
 * Type definitions for the JSON serialization service
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

/**
 * Result of a serialization operation
 */
export interface SerializationResult<T> {
  success: boolean;
  data?: T;
  error?: SerializationError;
}

/**
 * Detailed error information for serialization failures
 */
export interface SerializationError {
  message: string;
  code: SerializationErrorCode;
  position?: ErrorPosition;
  details?: string;
}

/**
 * Position information for parse errors
 */
export interface ErrorPosition {
  line: number;
  column: number;
  offset: number;
}

/**
 * Error codes for serialization operations
 */
export type SerializationErrorCode =
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'INVALID_INPUT'
  | 'CIRCULAR_REFERENCE'
  | 'UNKNOWN_ERROR';

/**
 * Options for JSON serialization
 */
export interface SerializeOptions {
  /** Pretty print with indentation (default: true) */
  pretty?: boolean;
  /** Indentation spaces (default: 2) */
  indent?: number;
  /** Sort object keys alphabetically (default: false) */
  sortKeys?: boolean;
}

/**
 * Options for JSON deserialization
 */
export interface DeserializeOptions {
  /** Validate the parsed data against a schema (optional) */
  validate?: (data: unknown) => boolean;
  /** Custom reviver function for JSON.parse */
  reviver?: (key: string, value: unknown) => unknown;
}

/**
 * JSON validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}
