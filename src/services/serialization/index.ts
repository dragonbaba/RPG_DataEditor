/**
 * Serialization Module Index
 * 
 * Re-exports all serialization types and services
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

export { JSONSerializer, jsonSerializer } from './JSONSerializer';
export {
  JSONSerializationError,
  ErrorPositionParser,
  ErrorMessageGenerator,
  SerializationErrorHandler,
} from './errors';
export type {
  SerializationResult,
  SerializationError,
  SerializationErrorCode,
  ErrorPosition,
  SerializeOptions,
  DeserializeOptions,
  ValidationResult,
  ValidationError,
} from './types';
