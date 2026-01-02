/**
 * MetaDataExtractor Property Tests
 * 
 * Property-based tests for meta data extraction and serialization
 * 
 * **Property 1: Round-Trip**
 * *For any* valid note string, parsing then serializing should preserve all tags.
 * **Validates: Requirements 2.4, 2.5, 2.6**
 * 
 * Feature: performance-optimization, Property 1: Round-Trip
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseMetaTags,
  serializeMetaTags,
  extractMetaData,
  serializeMetaData,
  parseValue,
  MetaTag,
  MetaData,
} from './metaDataExtractor';

/**
 * Generate valid tag names (no special characters that would break the regex)
 */
const tagNameArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => /^[a-zA-Z0-9_]+$/.test(s));

/**
 * Generate simple values that can be serialized and parsed back
 */
const simpleValueArb = fc.oneof(
  fc.integer(),
  fc.double({ noNaN: true, noDefaultInfinity: true }),
  fc.boolean(),
  fc.string({ minLength: 0, maxLength: 50 }).filter(s => !s.includes('<') && !s.includes('>') && !s.includes(':'))
);

/**
 * Generate a valid MetaTag
 */
const metaTagArb: fc.Arbitrary<MetaTag> = fc.record({
  name: tagNameArb,
  value: fc.oneof(
    fc.constant(true as const),
    simpleValueArb
  )
});

/**
 * Generate an array of unique MetaTags (no duplicate names)
 */
const uniqueMetaTagsArb = fc.array(metaTagArb, { minLength: 0, maxLength: 10 })
  .map(tags => {
    const seen = new Set<string>();
    return tags.filter(tag => {
      if (seen.has(tag.name)) return false;
      seen.add(tag.name);
      return true;
    });
  });

describe('MetaDataExtractor Property Tests', () => {
  /**
   * Property 1: Round-Trip
   * 
   * For any valid note string, parsing then serializing should preserve all tags.
   * 
   * **Validates: Requirements 2.4, 2.5, 2.6**
   * Feature: performance-optimization, Property 1: Round-Trip
   */
  describe('Property 1: Round-Trip', () => {
    it('should preserve tags through serialize-parse cycle (MetaTag[])', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueMetaTagsArb,
          async (originalTags) => {
            // Serialize tags to string
            const serialized = serializeMetaTags(originalTags);
            
            // Parse back to tags
            const parsedTags = parseMetaTags(serialized);
            
            // Verify same number of tags
            expect(parsedTags.length).toBe(originalTags.length);
            
            // Verify each tag is preserved
            for (let i = 0; i < originalTags.length; i++) {
              const original = originalTags[i];
              const parsed = parsedTags[i];
              
              expect(parsed.name).toBe(original.name);
              
              // For boolean true values, they should remain true
              if (original.value === true) {
                expect(parsed.value).toBe(true);
              } else {
                // For other values, compare after parsing
                const originalParsed = parseValue(String(original.value));
                expect(parsed.value).toEqual(originalParsed);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve meta data through serialize-extract cycle (MetaData)', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueMetaTagsArb,
          async (tags) => {
            // Convert tags to MetaData object
            const originalMeta: MetaData = {};
            for (const tag of tags) {
              originalMeta[tag.name] = tag.value;
            }
            
            // Serialize to string
            const serialized = serializeMetaData(originalMeta);
            
            // Extract back to MetaData
            const extractedMeta = extractMetaData(serialized);
            
            // Verify same keys
            const originalKeys = Object.keys(originalMeta).sort();
            const extractedKeys = Object.keys(extractedMeta).sort();
            expect(extractedKeys).toEqual(originalKeys);
            
            // Verify each value is preserved
            for (const key of originalKeys) {
              const original = originalMeta[key];
              const extracted = extractedMeta[key];
              
              if (original === true) {
                expect(extracted).toBe(true);
              } else {
                const originalParsed = parseValue(String(original));
                expect(extracted).toEqual(originalParsed);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle boolean tags correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(tagNameArb, { minLength: 1, maxLength: 5 })
            .map(names => [...new Set(names)]),
          async (tagNames) => {
            const tags: MetaTag[] = tagNames.map(name => ({ name, value: true }));
            const serialized = serializeMetaTags(tags);
            
            for (const name of tagNames) {
              expect(serialized).toContain(`<${name}>`);
              expect(serialized).not.toContain(`<${name}:`);
            }
            
            const parsed = parseMetaTags(serialized);
            for (const tag of parsed) {
              expect(tag.value).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle value tags with colon correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          tagNameArb,
          fc.integer({ min: -1000, max: 1000 }),
          async (name, value) => {
            const tag: MetaTag = { name, value };
            const serialized = serializeMetaTags([tag]);
            
            expect(serialized).toContain(`<${name}:`);
            expect(serialized).toContain(`${value}>`);
            
            const parsed = parseMetaTags(serialized);
            expect(parsed.length).toBe(1);
            expect(parsed[0].name).toBe(name);
            expect(parsed[0].value).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty input gracefully', () => {
      expect(parseMetaTags('')).toEqual([]);
      expect(parseMetaTags(null as unknown as string)).toEqual([]);
      expect(parseMetaTags(undefined as unknown as string)).toEqual([]);
      
      expect(extractMetaData('')).toEqual({});
      expect(extractMetaData(null as unknown as string)).toEqual({});
      expect(extractMetaData(undefined as unknown as string)).toEqual({});
      
      expect(serializeMetaTags([])).toBe('');
      expect(serializeMetaData({})).toBe('');
    });

    it('should parse numeric strings as numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          tagNameArb,
          fc.integer().map(n => String(n)),
          async (name, numStr) => {
            const note = `<${name}:${numStr}>`;
            const parsed = parseMetaTags(note);
            
            expect(parsed.length).toBe(1);
            expect(parsed[0].name).toBe(name);
            expect(typeof parsed[0].value).toBe('number');
            expect(parsed[0].value).toBe(Number(numStr));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse boolean strings as booleans', async () => {
      await fc.assert(
        fc.asyncProperty(
          tagNameArb,
          fc.constantFrom('true', 'false'),
          async (name, boolStr) => {
            const note = `<${name}:${boolStr}>`;
            const parsed = parseMetaTags(note);
            
            expect(parsed.length).toBe(1);
            expect(parsed[0].name).toBe(name);
            expect(typeof parsed[0].value).toBe('boolean');
            expect(parsed[0].value).toBe(boolStr === 'true');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
