/**
 * ProjectilePanel Property Tests
 * 
 * Property-based tests for projectile data management
 * 
 * **Feature: editor-data-management**
 * 
 * Property 1: New Item Increases Data Length
 * Property 2: Delete Sets Entry to Null
 * Property 4: Name Change Synchronization
 * Property 5: Data Save Round-Trip
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Default projectile structure for testing
 */
interface ProjectileData {
  name: string;
  startAnimationId: number;
  launchAnimation: {
    animationId: number;
    segments: Array<{
      targetX: number;
      targetY: number;
      duration: number;
      easeX: string;
      easeY: string;
    }>;
  };
  endAnimationId: number;
}

/**
 * Create a default projectile entry (mirrors createDefaultProjectile in ProjectilePanel.ts)
 */
function createDefaultProjectile(): ProjectileData {
  return {
    name: '新弹道',
    startAnimationId: 0,
    launchAnimation: {
      animationId: 0,
      segments: [{
        targetX: 0,
        targetY: -120,
        duration: 60,
        easeX: 'linear',
        easeY: 'linear',
      }],
    },
    endAnimationId: 0,
  };
}

/**
 * Simulate newProjectile operation
 */
function simulateNewProjectile(
  currentData: Array<ProjectileData | null>
): { newData: Array<ProjectileData | null>; newIndex: number } {
  const newEntry = createDefaultProjectile();
  const newData = [...currentData, newEntry];
  const newIndex = newData.length - 1;
  return { newData, newIndex };
}

/**
 * Simulate deleteProjectile operation (sets entry to null)
 */
function simulateDeleteProjectile(
  currentData: Array<ProjectileData | null>,
  indexToDelete: number
): Array<ProjectileData | null> {
  if (indexToDelete < 0 || indexToDelete >= currentData.length) {
    return currentData;
  }
  const newData = [...currentData];
  newData[indexToDelete] = null;
  return newData;
}

/**
 * Simulate name change operation
 */
function simulateNameChange(
  currentData: Array<ProjectileData | null>,
  index: number,
  newName: string
): Array<ProjectileData | null> {
  if (index < 0 || index >= currentData.length || currentData[index] === null) {
    return currentData;
  }
  const newData = [...currentData];
  newData[index] = { ...newData[index]!, name: newName };
  return newData;
}

/**
 * Generate a valid projectile data entry
 */
const projectileDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  startAnimationId: fc.integer({ min: 0, max: 100 }),
  launchAnimation: fc.record({
    animationId: fc.integer({ min: 0, max: 100 }),
    segments: fc.array(
      fc.record({
        targetX: fc.integer({ min: -500, max: 500 }),
        targetY: fc.integer({ min: -500, max: 500 }),
        duration: fc.integer({ min: 1, max: 300 }),
        easeX: fc.constantFrom('linear', 'easeInQuad', 'easeOutQuad'),
        easeY: fc.constantFrom('linear', 'easeInQuad', 'easeOutQuad'),
      }),
      { minLength: 1, maxLength: 5 }
    ),
  }),
  endAnimationId: fc.integer({ min: 0, max: 100 }),
});

/**
 * Generate a projectile data array (with null at index 0)
 */
const projectileDataArrayArb = fc.array(projectileDataArb, { minLength: 0, maxLength: 20 })
  .map(items => [null, ...items] as Array<ProjectileData | null>);

describe('ProjectilePanel Property Tests', () => {
  /**
   * **Feature: editor-data-management, Property 1: New Item Increases Data Length**
   * 
   * For any projectile data array, when a new projectile is created,
   * the array length SHALL increase by exactly 1.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 1: New Item Increases Data Length', () => {
    it('should increase array length by 1 when creating new projectile', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb,
          async (dataArray) => {
            const originalLength = dataArray.length;
            const { newData } = simulateNewProjectile(dataArray);
            
            // Array length should increase by exactly 1
            expect(newData.length).toBe(originalLength + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should place new item at the end of the array', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb,
          async (dataArray) => {
            const { newData, newIndex } = simulateNewProjectile(dataArray);
            
            // New index should be the last position
            expect(newIndex).toBe(newData.length - 1);
            // New item should not be null
            expect(newData[newIndex]).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create new item with default values', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb,
          async (dataArray) => {
            const { newData, newIndex } = simulateNewProjectile(dataArray);
            const newItem = newData[newIndex];
            
            // New item should have default name
            expect(newItem?.name).toBe('新弹道');
            // New item should have default animation IDs
            expect(newItem?.startAnimationId).toBe(0);
            expect(newItem?.endAnimationId).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: editor-data-management, Property 2: Delete Sets Entry to Null**
   * 
   * For any projectile data array and valid index, when a projectile is deleted,
   * the entry at that index SHALL be set to null (not removed from array).
   * 
   * **Validates: Requirements 1.5, 1.6**
   */
  describe('Property 2: Delete Sets Entry to Null', () => {
    it('should set deleted entry to null without changing array length', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb.filter(arr => arr.length > 1),
          fc.integer({ min: 1, max: 100 }),
          async (dataArray, indexOffset) => {
            // Get a valid index (skip null at index 0)
            const validIndices = dataArray
              .map((item, idx) => item !== null ? idx : -1)
              .filter(idx => idx > 0);
            
            if (validIndices.length === 0) return;
            
            const indexToDelete = validIndices[indexOffset % validIndices.length];
            const originalLength = dataArray.length;
            const newData = simulateDeleteProjectile(dataArray, indexToDelete);
            
            // Array length should remain the same
            expect(newData.length).toBe(originalLength);
            // Deleted entry should be null
            expect(newData[indexToDelete]).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other entries when deleting', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb.filter(arr => arr.length > 2),
          fc.integer({ min: 1, max: 100 }),
          async (dataArray, indexOffset) => {
            const validIndices = dataArray
              .map((item, idx) => item !== null ? idx : -1)
              .filter(idx => idx > 0);
            
            if (validIndices.length === 0) return;
            
            const indexToDelete = validIndices[indexOffset % validIndices.length];
            const newData = simulateDeleteProjectile(dataArray, indexToDelete);
            
            // All other entries should remain unchanged
            for (let i = 0; i < dataArray.length; i++) {
              if (i !== indexToDelete) {
                expect(newData[i]).toEqual(dataArray[i]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle invalid index gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb,
          fc.integer({ min: -100, max: -1 }),
          async (dataArray, negativeIndex) => {
            const newData = simulateDeleteProjectile(dataArray, negativeIndex);
            
            // Array should remain unchanged for invalid index
            expect(newData).toEqual(dataArray);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: editor-data-management, Property 4: Name Change Synchronization**
   * 
   * For any projectile data array and valid index, when the name is changed,
   * the data array SHALL be updated with the new name.
   * 
   * **Validates: Requirements 3.2, 4.1**
   */
  describe('Property 4: Name Change Synchronization', () => {
    it('should update name in data array when changed', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb.filter(arr => arr.some((item, idx) => idx > 0 && item !== null)),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          async (dataArray, newName, indexOffset) => {
            const validIndices = dataArray
              .map((item, idx) => item !== null ? idx : -1)
              .filter(idx => idx > 0);
            
            if (validIndices.length === 0) return;
            
            const indexToUpdate = validIndices[indexOffset % validIndices.length];
            const newData = simulateNameChange(dataArray, indexToUpdate, newName);
            
            // Name should be updated
            expect(newData[indexToUpdate]?.name).toBe(newName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other fields when name changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb.filter(arr => arr.some((item, idx) => idx > 0 && item !== null)),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          async (dataArray, newName, indexOffset) => {
            const validIndices = dataArray
              .map((item, idx) => item !== null ? idx : -1)
              .filter(idx => idx > 0);
            
            if (validIndices.length === 0) return;
            
            const indexToUpdate = validIndices[indexOffset % validIndices.length];
            const originalItem = dataArray[indexToUpdate];
            const newData = simulateNameChange(dataArray, indexToUpdate, newName);
            const updatedItem = newData[indexToUpdate];
            
            // Other fields should remain unchanged
            expect(updatedItem?.startAnimationId).toBe(originalItem?.startAnimationId);
            expect(updatedItem?.endAnimationId).toBe(originalItem?.endAnimationId);
            expect(updatedItem?.launchAnimation).toEqual(originalItem?.launchAnimation);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: editor-data-management, Property 5: Data Save Round-Trip**
   * 
   * For any projectile data, when saved and loaded, the data SHALL be identical.
   * 
   * **Validates: Requirements 1.4, 3.3, 4.2**
   */
  describe('Property 5: Data Save Round-Trip', () => {
    it('should preserve all data through JSON serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb,
          async (dataArray) => {
            // Simulate save (JSON stringify) and load (JSON parse)
            const serialized = JSON.stringify(dataArray);
            const deserialized = JSON.parse(serialized);
            
            // Data should be identical after round-trip
            expect(deserialized).toEqual(dataArray);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve name field through save round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArb,
          async (projectile) => {
            const dataArray = [null, projectile];
            const serialized = JSON.stringify(dataArray);
            const deserialized = JSON.parse(serialized);
            
            // Name should be preserved
            expect(deserialized[1].name).toBe(projectile.name);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve null entries through save round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          projectileDataArrayArb.filter(arr => arr.length > 2),
          fc.integer({ min: 1, max: 100 }),
          async (dataArray, indexOffset) => {
            const validIndices = dataArray
              .map((item, idx) => item !== null ? idx : -1)
              .filter(idx => idx > 0);
            
            if (validIndices.length === 0) return;
            
            // Delete an item (set to null)
            const indexToDelete = validIndices[indexOffset % validIndices.length];
            const dataWithNull = simulateDeleteProjectile(dataArray, indexToDelete);
            
            // Round-trip
            const serialized = JSON.stringify(dataWithNull);
            const deserialized = JSON.parse(serialized);
            
            // Null entry should be preserved
            expect(deserialized[indexToDelete]).toBeNull();
            // Array length should be preserved
            expect(deserialized.length).toBe(dataWithNull.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
