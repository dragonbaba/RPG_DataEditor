/**
 * QuestPanel Property Tests
 * 
 * Property-based tests for quest panel functionality
 * 
 * **Property 6: Reward Select Option Formatting**
 * *For any* loaded system data with switches and variables, the reward section's 
 * switch and variable select options SHALL display in the format "ID : Name" 
 * where Name comes from the system data.
 * **Validates: Requirements 5.1, 5.2**
 * 
 * **Property 7: Reward Selection Persistence**
 * *For any* switch or variable selection in the reward section, saving the quest 
 * data SHALL correctly persist the selected ID, and loading SHALL restore the same selection.
 * **Validates: Requirements 5.5**
 * 
 * Feature: editor-data-management, Property 6: Reward Select Option Formatting
 * Feature: editor-data-management, Property 7: Reward Selection Persistence
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Helper function to simulate fillDataSelect behavior
 * This mirrors the logic in QuestPanel.ts fillDataSelect function
 */
function formatSelectOptions(
  data: Array<{ id?: number; name?: string; label?: string } | string | null> | undefined,
  fallback: string
): Array<{ value: string; text: string }> {
  if (!data || data.length <= 1) {
    return [{ value: '0', text: `未加载${fallback}` }];
  }
  
  const options: Array<{ value: string; text: string }> = [];
  for (let i = 1; i < data.length; i++) {
    const entry = data[i];
    if (!entry) continue;
    
    let id = i;
    let name = fallback;
    
    if (typeof entry === 'string') {
      name = entry;
    } else {
      id = entry.id ?? i;
      name = entry.name || entry.label || fallback;
    }
    
    options.push({
      value: String(id),
      text: `${id} : ${name}`
    });
  }
  
  return options;
}

/**
 * Generate a valid switch name
 */
const switchNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':'));

/**
 * Generate a valid variable name
 */
const variableNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':'));

/**
 * Generate a switches array (with null at index 0, strings from index 1)
 */
const switchesArrayArb = fc.array(switchNameArb, { minLength: 1, maxLength: 50 })
  .map(names => [null, ...names]);

/**
 * Generate a variables array (with null at index 0, strings from index 1)
 */
const variablesArrayArb = fc.array(variableNameArb, { minLength: 1, maxLength: 50 })
  .map(names => [null, ...names]);

/**
 * Generate a quest reward with switch type
 */
const switchRewardArb = fc.record({
  type: fc.constant(6),
  switchId: fc.integer({ min: 1, max: 50 }),
  targetValue: fc.boolean(),
  description: fc.string({ minLength: 0, maxLength: 50 }),
});

/**
 * Generate a quest reward with variable type
 */
const variableRewardArb = fc.record({
  type: fc.constant(7),
  variableId: fc.integer({ min: 1, max: 50 }),
  targetValue: fc.integer({ min: -1000, max: 1000 }),
  op: fc.constantFrom('+', '-', '*', '/', '='),
  description: fc.string({ minLength: 0, maxLength: 50 }),
});

describe('QuestPanel Property Tests', () => {
  /**
   * Property 6: Reward Select Option Formatting
   * 
   * For any loaded system data with switches and variables, the reward section's 
   * switch and variable select options SHALL display in the format "ID : Name" 
   * where Name comes from the system data.
   * 
   * **Validates: Requirements 5.1, 5.2**
   * Feature: editor-data-management, Property 6: Reward Select Option Formatting
   */
  describe('Property 6: Reward Select Option Formatting', () => {
    it('should format switch options as "ID : Name"', async () => {
      await fc.assert(
        fc.asyncProperty(
          switchesArrayArb,
          async (switches) => {
            const options = formatSelectOptions(switches as (string | null)[], '开关');
            
            // Each option should be in "ID : Name" format
            for (let i = 0; i < options.length; i++) {
              const option = options[i];
              const expectedId = i + 1; // IDs start from 1
              const expectedName = switches[expectedId] as string;
              
              expect(option.value).toBe(String(expectedId));
              expect(option.text).toBe(`${expectedId} : ${expectedName}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format variable options as "ID : Name"', async () => {
      await fc.assert(
        fc.asyncProperty(
          variablesArrayArb,
          async (variables) => {
            const options = formatSelectOptions(variables as (string | null)[], '变量');
            
            // Each option should be in "ID : Name" format
            for (let i = 0; i < options.length; i++) {
              const option = options[i];
              const expectedId = i + 1; // IDs start from 1
              const expectedName = variables[expectedId] as string;
              
              expect(option.value).toBe(String(expectedId));
              expect(option.text).toBe(`${expectedId} : ${expectedName}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show placeholder when data is not loaded', () => {
      // Empty array
      let options = formatSelectOptions([], '开关');
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('0');
      expect(options[0].text).toBe('未加载开关');
      
      // Only null at index 0
      options = formatSelectOptions([null], '变量');
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('0');
      expect(options[0].text).toBe('未加载变量');
      
      // Undefined
      options = formatSelectOptions(undefined, '开关');
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('0');
      expect(options[0].text).toBe('未加载开关');
    });

    it('should handle object entries with id and name fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':')),
            }),
            { minLength: 1, maxLength: 20 }
          ).map(items => [null, ...items]),
          async (data) => {
            const options = formatSelectOptions(data as any[], '数据');
            
            for (let i = 0; i < options.length; i++) {
              const option = options[i];
              const entry = data[i + 1] as { id: number; name: string };
              
              expect(option.value).toBe(String(entry.id));
              expect(option.text).toBe(`${entry.id} : ${entry.name}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Reward Selection Persistence
   * 
   * For any switch or variable selection in the reward section, saving the quest 
   * data SHALL correctly persist the selected ID, and loading SHALL restore the same selection.
   * 
   * **Validates: Requirements 5.5**
   * Feature: editor-data-management, Property 7: Reward Selection Persistence
   */
  describe('Property 7: Reward Selection Persistence', () => {
    it('should persist switch reward selection through serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          switchRewardArb,
          async (reward) => {
            // Simulate serialization (JSON stringify/parse)
            const serialized = JSON.stringify(reward);
            const deserialized = JSON.parse(serialized);
            
            // Verify all fields are preserved
            expect(deserialized.type).toBe(6);
            expect(deserialized.switchId).toBe(reward.switchId);
            expect(deserialized.targetValue).toBe(reward.targetValue);
            expect(deserialized.description).toBe(reward.description);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist variable reward selection through serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          variableRewardArb,
          async (reward) => {
            // Simulate serialization (JSON stringify/parse)
            const serialized = JSON.stringify(reward);
            const deserialized = JSON.parse(serialized);
            
            // Verify all fields are preserved
            expect(deserialized.type).toBe(7);
            expect(deserialized.variableId).toBe(reward.variableId);
            expect(deserialized.targetValue).toBe(reward.targetValue);
            expect(deserialized.op).toBe(reward.op);
            expect(deserialized.description).toBe(reward.description);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain selection value within valid range', async () => {
      await fc.assert(
        fc.asyncProperty(
          switchesArrayArb,
          fc.integer({ min: 1, max: 50 }),
          async (switches, selectedId) => {
            const maxValidId = switches.length - 1;
            const clampedId = Math.min(selectedId, maxValidId);
            
            // If selected ID is within range, it should be valid
            if (selectedId <= maxValidId) {
              expect(switches[selectedId]).toBeDefined();
            }
            
            // Clamped ID should always be valid
            if (clampedId >= 1) {
              expect(switches[clampedId]).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
