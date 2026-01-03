/**
 * Property-based tests for formatBytes utility functions
 * **Feature: auto-update-ui, Property 1: Byte formatting produces valid output**
 * **Validates: Requirements 1.3, 1.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatBytes, formatSpeed } from '../formatBytes';

describe('formatBytes property tests', () => {
  it('Property 1: Byte formatting produces valid output', () => {
    /**
     * **Feature: auto-update-ui, Property 1: Byte formatting produces valid output**
     * **Validates: Requirements 1.3, 1.4**
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: 10 }),
        (bytes, decimals) => {
          const result = formatBytes(bytes, decimals);
          
          // Should return a string
          expect(typeof result).toBe('string');
          
          // Should contain a number followed by a space and a valid unit
          const validUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
          const pattern = new RegExp(`^\\d+(\\.\\d+)?\\s+(${validUnits.join('|')})$`);
          expect(result).toMatch(pattern);
          
          // The number part should be non-negative
          const numberPart = parseFloat(result.split(' ')[0]);
          expect(numberPart).toBeGreaterThanOrEqual(0);
          
          // For non-zero bytes, the result should not be "0 B"
          if (bytes > 0) {
            expect(result).not.toBe('0 B');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles edge cases correctly', () => {
    // Test zero bytes
    expect(formatBytes(0)).toBe('0 B');
    
    // Test negative bytes (should return 0 B)
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(-100)).toBe('0 B');
    
    // Test specific known values
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1536, 1)).toBe('1.5 KB'); // 1.5 KB
  });
});

describe('formatSpeed property tests', () => {
  it('Property 2: Speed formatting produces valid output', () => {
    /**
     * **Feature: auto-update-ui, Property 2: Speed formatting produces valid output**
     * **Validates: Requirements 1.3**
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (bytesPerSecond) => {
          const result = formatSpeed(bytesPerSecond);
          
          // Should return a string
          expect(typeof result).toBe('string');
          
          // Should contain a number followed by a space and a valid speed unit
          const validUnits = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s', 'ZB/s', 'YB/s'];
          const pattern = new RegExp(`^\\d+(\\.\\d+)?\\s+(${validUnits.join('|').replace(/\//g, '\\/')})$`);
          expect(result).toMatch(pattern);
          
          // The number part should be non-negative
          const numberPart = parseFloat(result.split(' ')[0]);
          expect(numberPart).toBeGreaterThanOrEqual(0);
          
          // For non-zero speed, the result should not be "0 B/s"
          if (bytesPerSecond > 0) {
            expect(result).not.toBe('0 B/s');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles speed edge cases correctly', () => {
    // Test zero speed
    expect(formatSpeed(0)).toBe('0 B/s');
    
    // Test negative speed (should return 0 B/s)
    expect(formatSpeed(-1)).toBe('0 B/s');
    expect(formatSpeed(-100)).toBe('0 B/s');
    
    // Test specific known values
    expect(formatSpeed(1024)).toBe('1 KB/s');
    expect(formatSpeed(1024 * 1024)).toBe('1 MB/s');
    expect(formatSpeed(1536)).toBe('1.5 KB/s'); // 1.5 KB/s
  });
});