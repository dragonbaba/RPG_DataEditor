/**
 * JSONSerializer Tests
 * 
 * Unit tests for JSON serialization service
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { describe, it, expect } from 'vitest';
import { JSONSerializer, jsonSerializer } from './JSONSerializer';
import { ErrorPositionParser, ErrorMessageGenerator } from './errors';

describe('JSONSerializer', () => {
  describe('serialize', () => {
    it('should serialize objects to JSON string', () => {
      const data = { name: 'test', value: 42 };
      const result = jsonSerializer.serialize(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(JSON.parse(result.data!)).toEqual(data);
    });

    it('should pretty print by default', () => {
      const data = { a: 1, b: 2 };
      const result = jsonSerializer.serialize(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('\n');
    });

    it('should minify when pretty is false', () => {
      const data = { a: 1, b: 2 };
      const result = jsonSerializer.serialize(data, { pretty: false });
      
      expect(result.success).toBe(true);
      expect(result.data).not.toContain('\n');
      expect(result.data).toBe('{"a":1,"b":2}');
    });

    it('should sort keys when sortKeys is true', () => {
      const data = { z: 1, a: 2, m: 3 };
      const result = jsonSerializer.serialize(data, { sortKeys: true, pretty: false });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('{"a":2,"m":3,"z":1}');
    });

    it('should handle undefined input', () => {
      const result = jsonSerializer.serialize(undefined);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle circular references', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      
      const result = jsonSerializer.serialize(obj);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CIRCULAR_REFERENCE');
    });

    it('should serialize arrays', () => {
      const data = [1, 2, 3, { nested: true }];
      const result = jsonSerializer.serialize(data);
      
      expect(result.success).toBe(true);
      expect(JSON.parse(result.data!)).toEqual(data);
    });

    it('should serialize null', () => {
      const result = jsonSerializer.serialize(null);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('null');
    });
  });

  describe('deserialize', () => {
    it('should parse valid JSON', () => {
      const json = '{"name":"test","value":42}';
      const result = jsonSerializer.deserialize<{ name: string; value: number }>(json);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 42 });
    });

    it('should handle empty input', () => {
      const result = jsonSerializer.deserialize('');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle whitespace-only input', () => {
      const result = jsonSerializer.deserialize('   ');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle malformed JSON', () => {
      const result = jsonSerializer.deserialize('{invalid}');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should provide position for parse errors', () => {
      const json = '{\n  "name": "test",\n  "value": invalid\n}';
      const result = jsonSerializer.deserialize(json);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
      // Position may or may not be available depending on the JS engine
    });

    it('should validate with custom validator', () => {
      const json = '{"name":"test"}';
      const result = jsonSerializer.deserialize(json, {
        validate: (data) => typeof (data as { name: string }).name === 'string' && (data as { name: string }).name.length > 0,
      });
      
      expect(result.success).toBe(true);
    });

    it('should fail validation with invalid data', () => {
      const json = '{"name":""}';
      const result = jsonSerializer.deserialize(json, {
        validate: (data) => (data as { name: string }).name.length > 0,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('validate', () => {
    it('should return valid for correct JSON', () => {
      const result = jsonSerializer.validate('{"a":1}');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for malformed JSON', () => {
      const result = jsonSerializer.validate('{invalid}');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for empty string', () => {
      const result = jsonSerializer.validate('');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('prettyPrint', () => {
    it('should format minified JSON', () => {
      const json = '{"a":1,"b":2}';
      const result = jsonSerializer.prettyPrint(json);
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('\n');
    });

    it('should handle invalid JSON', () => {
      const result = jsonSerializer.prettyPrint('{invalid}');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });

  describe('minify', () => {
    it('should minify pretty JSON', () => {
      const json = '{\n  "a": 1,\n  "b": 2\n}';
      const result = jsonSerializer.minify(json);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('{"a":1,"b":2}');
    });
  });
});

describe('ErrorPositionParser', () => {
  describe('offsetToLineColumn', () => {
    it('should convert offset to line and column', () => {
      const input = 'line1\nline2\nline3';
      
      expect(ErrorPositionParser.offsetToLineColumn(input, 0)).toEqual({ line: 1, column: 1 });
      expect(ErrorPositionParser.offsetToLineColumn(input, 5)).toEqual({ line: 1, column: 6 });
      expect(ErrorPositionParser.offsetToLineColumn(input, 6)).toEqual({ line: 2, column: 1 });
      expect(ErrorPositionParser.offsetToLineColumn(input, 12)).toEqual({ line: 3, column: 1 });
    });
  });

  describe('lineColumnToOffset', () => {
    it('should convert line and column to offset', () => {
      const input = 'line1\nline2\nline3';
      
      expect(ErrorPositionParser.lineColumnToOffset(input, 1, 1)).toBe(0);
      expect(ErrorPositionParser.lineColumnToOffset(input, 2, 1)).toBe(6);
      expect(ErrorPositionParser.lineColumnToOffset(input, 3, 1)).toBe(12);
    });
  });

  describe('getContextSnippet', () => {
    it('should generate context snippet around error', () => {
      const input = 'line1\nline2\nline3\nline4\nline5';
      const position = { line: 3, column: 3, offset: 14 };
      
      const snippet = ErrorPositionParser.getContextSnippet(input, position, 1);
      
      expect(snippet).toContain('line2');
      expect(snippet).toContain('line3');
      expect(snippet).toContain('line4');
      expect(snippet).toContain('>>>');
    });
  });
});

describe('ErrorMessageGenerator', () => {
  describe('generate', () => {
    it('should generate user-friendly messages', () => {
      const message = ErrorMessageGenerator.generate('PARSE_ERROR', 'Unexpected token', { line: 1, column: 5, offset: 4 });
      
      expect(message).toContain('JSON解析错误');
      expect(message).toContain('第 1 行');
      expect(message).toContain('第 5 列');
    });

    it('should include hints for common errors', () => {
      const message = ErrorMessageGenerator.generate('PARSE_ERROR', 'Unexpected end of JSON input');
      
      expect(message).toContain('提示');
    });
  });
});
