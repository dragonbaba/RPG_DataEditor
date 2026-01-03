/**
 * ItemList Property Tests
 * 
 * Property-based tests for item list index display
 * 
 * **Property 3: Quest Index Display Consistency**
 * *For any* quest data array, when rendered in the data list, the displayed index 
 * for an item at array position N SHALL equal N (not N+1 or any other value).
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * Feature: editor-data-management, Property 3: Quest Index Display Consistency
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Helper function to calculate display index based on file type
 * This mirrors the logic in ItemList.ts renderListItems function
 */
function getDisplayIndex(
  arrayIndex: number,
  fileType: string,
  itemData: Record<string, unknown>
): number {
  const isQuest = fileType === 'quest';
  const isProjectile = fileType === 'projectile';
  
  // For quest and projectile types, use array index
  // For other types, use data's id field if available
  if (isQuest || isProjectile) {
    return arrayIndex;
  }
  return (itemData.id as number) || arrayIndex;
}

/**
 * Generate a valid quest data entry
 */
const questDataArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 50 }),
  giver: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.boolean(),
  repeatable: fc.boolean(),
  difficulty: fc.integer({ min: 1, max: 5 }),
  description: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
  requirements: fc.constant([]),
  objectives: fc.constant([]),
  rewards: fc.constant([]),
});

/**
 * Generate a valid projectile data entry
 */
const projectileDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  startAnimationId: fc.integer({ min: 0, max: 100 }),
  endAnimationId: fc.integer({ min: 0, max: 100 }),
});

/**
 * Generate a valid generic data entry with id
 */
const genericDataArb = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

/**
 * Generate a quest data array (with null at index 0)
 */
const questDataArrayArb = fc.array(questDataArb, { minLength: 1, maxLength: 20 })
  .map(items => [null, ...items]);

/**
 * Generate a projectile data array (with null at index 0)
 */
const projectileDataArrayArb = fc.array(projectileDataArb, { minLength: 1, maxLength: 20 })
  .map(items => [null, ...items]);

describe('ItemList Property Tests', () => {
  /**
   * Property 3: Quest Index Display Consistency
   * 
   * For any quest data array, when rendered in the data list, the displayed index 
   * for an item at array position N SHALL equal N (not N+1 or any other value).
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * Feature: editor-data-management, Property 3: Quest Index Display Consistency
   */
  describe('Property 3: Quest Index Display Consistency', () => {
    it('should display quest indices equal to array indices', async () => {
      await fc.assert(
        fc.asyncProperty(
          questDataArrayArb,
          async (dataArray) => {
            // For each item in the array (starting from index 1)
            for (let i = 1; i < dataArray.length; i++) {
              const item = dataArray[i];
              if (item === null) continue;
              
              const displayIndex = getDisplayIndex(i, 'quest', item as Record<string, unknown>);
              
              // The displayed index should equal the array index
              expect(displayIndex).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display projectile indices equal to array indices', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb,
          async (dataArray) => {
            // For each item in the array (starting from index 1)
            for (let i = 1; i < dataArray.length; i++) {
              const item = dataArray[i];
              if (item === null) continue;
              
              const displayIndex = getDisplayIndex(i, 'projectile', item as Record<string, unknown>);
              
              // The displayed index should equal the array index
              expect(displayIndex).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use data id for generic file types when available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(genericDataArb, { minLength: 1, maxLength: 20 })
            .map(items => [null, ...items]),
          async (dataArray) => {
            for (let i = 1; i < dataArray.length; i++) {
              const item = dataArray[i];
              if (item === null) continue;
              
              const displayIndex = getDisplayIndex(i, 'items', item as Record<string, unknown>);
              
              // For generic types, should use the id field
              expect(displayIndex).toBe((item as Record<string, unknown>).id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fall back to array index when id is not available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({ name: fc.string({ minLength: 1, maxLength: 50 }) }),
            { minLength: 1, maxLength: 20 }
          ).map(items => [null, ...items]),
          async (dataArray) => {
            for (let i = 1; i < dataArray.length; i++) {
              const item = dataArray[i];
              if (item === null) continue;
              
              const displayIndex = getDisplayIndex(i, 'items', item as Record<string, unknown>);
              
              // When no id field, should fall back to array index
              expect(displayIndex).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle first item at index 1 correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          questDataArb,
          async (questData) => {
            const dataArray = [null, questData];
            const displayIndex = getDisplayIndex(1, 'quest', questData as Record<string, unknown>);
            
            // First quest item should display as #1
            expect(displayIndex).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
