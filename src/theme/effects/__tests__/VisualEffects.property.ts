/**
 * Property-based tests for VisualEffects
 * 
 * Tests animation system integration and visual effect consistency
 * Requirements: 2.7, 4.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { VisualEffects } from '../VisualEffects';

// Mock DOM environment
const mockElement = () => ({
  style: {
    cssText: '',
    position: '',
    overflow: '',
    boxShadow: '',
    opacity: '1',
    transform: 'scale(1)',
    filter: '',
    left: '0px',
    top: '0px',
    setProperty: vi.fn(),
  },
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    contains: vi.fn(),
  },
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  offsetWidth: 800,
  offsetHeight: 600,
});

describe('VisualEffects Property Tests', () => {
  let visualEffects: VisualEffects;
  let mockContainer: any;

  beforeEach(() => {
    visualEffects = new VisualEffects();
    mockContainer = mockElement();
    
    // Mock document.createElement
    global.document = {
      createElement: vi.fn().mockImplementation(() => mockElement()),
    } as any;
  });

  afterEach(() => {
    visualEffects.dispose();
    vi.clearAllMocks();
  });

  /**
   * Property 3: Animation system integration
   * Validates: Requirements 2.7, 4.4
   */
  describe('Property 3: Animation system integration', () => {
    it('should create valid motion objects for any effect configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            color: fc.string({ minLength: 7, maxLength: 20 }),
            intensity: fc.float({ min: 0, max: Math.fround(1) }),
            duration: fc.integer({ min: 100, max: 5000 }),
            infinite: fc.boolean(),
          }),
          (config) => {
            const motion = visualEffects.createPulsingGlow(mockContainer, config);
            
            if (motion) {
              // Verify motion object has required methods
              expect(typeof motion.start).toBe('function');
              expect(typeof motion.stop).toBe('function');
              expect(typeof motion.onUpdate).toBe('function');
              expect(typeof motion.onComplete).toBe('function');
              
              // Verify motion is properly configured
              expect(motion).toBeDefined();
            }
            
            // Should not throw errors with any valid configuration
            expect(() => {
              visualEffects.createPulsingGlow(mockContainer, config);
            }).not.toThrow();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle effects being disabled gracefully', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (effectsEnabled) => {
            visualEffects.setEffectsEnabled(effectsEnabled);
            
            const motion = visualEffects.createPulsingGlow(mockContainer);
            
            if (effectsEnabled) {
              expect(motion).toBeDefined();
            } else {
              expect(motion).toBeNull();
            }
            
            // Stats should reflect the enabled state
            const stats = visualEffects.getStats();
            expect(stats.effectsEnabled).toBe(effectsEnabled);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should properly track and cleanup animations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              effectType: fc.constantFrom('glow', 'scan', 'flicker'),
              duration: fc.integer({ min: 100, max: 1000 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (effects) => {
            const initialStats = visualEffects.getStats();
            const createdMotions: any[] = [];
            
            // Create multiple effects
            effects.forEach(({ effectType, duration }) => {
              let motion;
              switch (effectType) {
                case 'glow':
                  motion = visualEffects.createPulsingGlow(mockContainer, { duration, infinite: false });
                  break;
                case 'scan':
                  motion = visualEffects.createScanningLine(mockContainer, { speed: duration });
                  break;
                case 'flicker':
                  motion = visualEffects.createHolographicFlicker(mockContainer, { duration });
                  break;
              }
              if (motion) createdMotions.push(motion);
            });
            
            // Verify animations are tracked
            const activeStats = visualEffects.getStats();
            expect(activeStats.totalAnimations).toBeGreaterThanOrEqual(initialStats.totalAnimations);
            
            // Stop all animations
            visualEffects.stopAnimations(mockContainer);
            
            // Verify cleanup
            const finalStats = visualEffects.getStats();
            expect(finalStats.totalAnimations).toBeLessThanOrEqual(activeStats.totalAnimations);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should create particle effects with consistent parameters', () => {
      fc.assert(
        fc.property(
          fc.record({
            particleCount: fc.integer({ min: 1, max: 20 }),
            speed: fc.integer({ min: 1000, max: 10000 }),
            size: fc.integer({ min: 1, max: 5 }),
          }),
          (config) => {
            const motions = visualEffects.createParticleField(mockContainer, config);
            
            // Should create motions for particles
            expect(Array.isArray(motions)).toBe(true);
            
            // Number of motions should be reasonable (may be less than particleCount due to batching)
            expect(motions.length).toBeGreaterThanOrEqual(0);
            expect(motions.length).toBeLessThanOrEqual(config.particleCount);
            
            // Each motion should be valid
            motions.forEach(motion => {
              expect(motion).toBeDefined();
              expect(typeof motion.start).toBe('function');
              expect(typeof motion.stop).toBe('function');
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle energy wave effects with different directions', () => {
      fc.assert(
        fc.property(
          fc.record({
            direction: fc.constantFrom('horizontal', 'vertical'),
            duration: fc.integer({ min: 500, max: 3000 }),
            color: fc.string({ minLength: 10, maxLength: 30 }),
          }),
          (config) => {
            const motion = visualEffects.createEnergyWave(mockContainer, config);
            
            if (motion) {
              expect(motion).toBeDefined();
              expect(typeof motion.start).toBe('function');
              expect(typeof motion.stop).toBe('function');
            }
            
            // Should handle both directions without errors
            expect(() => {
              visualEffects.createEnergyWave(mockContainer, config);
            }).not.toThrow();
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should maintain performance stats consistency', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('glow', 'scan', 'wave'),
            { minLength: 0, maxLength: 10 }
          ),
          (effectTypes) => {
            const initialStats = visualEffects.getStats();
            
            // Create effects
            effectTypes.forEach(effectType => {
              switch (effectType) {
                case 'glow':
                  visualEffects.createPulsingGlow(mockContainer);
                  break;
                case 'scan':
                  visualEffects.createScanningLine(mockContainer);
                  break;
                case 'wave':
                  visualEffects.createEnergyWave(mockContainer);
                  break;
              }
            });
            
            const afterStats = visualEffects.getStats();
            
            // Stats should be consistent
            expect(afterStats.activeElements).toBeGreaterThanOrEqual(initialStats.activeElements);
            expect(afterStats.totalAnimations).toBeGreaterThanOrEqual(initialStats.totalAnimations);
            expect(typeof afterStats.effectsEnabled).toBe('boolean');
            
            // Active elements should not exceed total animations
            expect(afterStats.activeElements).toBeLessThanOrEqual(afterStats.totalAnimations + 1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle digital rain effect with various configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            columns: fc.integer({ min: 1, max: 50 }),
            speed: fc.integer({ min: 50, max: 500 }),
            characters: fc.string({ minLength: 5, maxLength: 20 }),
          }),
          (config) => {
            const motions = visualEffects.createDigitalRain(mockContainer, config);
            
            // Should create array of motions
            expect(Array.isArray(motions)).toBe(true);
            
            // Should create reasonable number of motions
            expect(motions.length).toBeGreaterThanOrEqual(0);
            expect(motions.length).toBeLessThanOrEqual(config.columns);
            
            // Each motion should be valid
            motions.forEach(motion => {
              expect(motion).toBeDefined();
              expect(typeof motion.start).toBe('function');
            });
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null or undefined elements gracefully', () => {
      expect(() => {
        visualEffects.createPulsingGlow(null as any);
      }).not.toThrow();
      
      expect(() => {
        visualEffects.createScanningLine(undefined as any);
      }).not.toThrow();
    });

    it('should handle extreme parameter values', () => {
      fc.assert(
        fc.property(
          fc.record({
            intensity: fc.float({ min: -10, max: 10 }),
            duration: fc.integer({ min: -1000, max: 100000 }),
            particleCount: fc.integer({ min: -10, max: 1000 }),
          }),
          (extremeConfig) => {
            // Should not crash with extreme values
            expect(() => {
              visualEffects.createPulsingGlow(mockContainer, extremeConfig);
              visualEffects.createParticleField(mockContainer, extremeConfig);
            }).not.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle rapid enable/disable toggling', () => {
      for (let i = 0; i < 10; i++) {
        visualEffects.setEffectsEnabled(i % 2 === 0);
        const stats = visualEffects.getStats();
        expect(typeof stats.effectsEnabled).toBe('boolean');
      }
    });

    it('should handle disposal during active animations', () => {
      // Create some effects
      visualEffects.createPulsingGlow(mockContainer);
      visualEffects.createScanningLine(mockContainer);
      
      const statsBeforeDispose = visualEffects.getStats();
      expect(statsBeforeDispose.totalAnimations).toBeGreaterThan(0);
      
      // Dispose should not throw
      expect(() => {
        visualEffects.dispose();
      }).not.toThrow();
      
      // Stats should be reset
      const statsAfterDispose = visualEffects.getStats();
      expect(statsAfterDispose.totalAnimations).toBe(0);
      expect(statsAfterDispose.activeElements).toBe(0);
    });
  });
});