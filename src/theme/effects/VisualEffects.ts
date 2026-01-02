/**
 * Visual Effects - Sci-fi visual effects with global animation system integration
 * 
 * Requirements: 2.3, 2.4, 2.7, 4.4
 */

import { createMotion, type Motion } from '../../utils/animation';
import { delay } from '../../utils/runner';
import { logger } from '../../services/logger';

/**
 * Visual effects manager for sci-fi theme elements
 */
export class VisualEffects {
  private activeAnimations = new Map<HTMLElement, Motion[]>();
  private effectsEnabled = true;

  /**
   * Enable or disable visual effects
   */
  setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled;
    
    if (!enabled) {
      // Stop all active animations
      this.stopAllAnimations();
    }
    
    logger.info('Visual effects toggled', { enabled }, 'VisualEffects');
  }

  /**
   * Create pulsing glow effect
   */
  createPulsingGlow(element: HTMLElement, options: {
    color?: string;
    intensity?: number;
    duration?: number;
    infinite?: boolean;
  } = {}): Motion | null {
    if (!this.effectsEnabled || !element) return null;

    const {
      color = 'rgba(0, 240, 255, 0.3)',
      intensity = 0.7,
      duration = 2000,
      infinite = true,
    } = options;

    const motion = createMotion()
      .setAnimation(intensity * 0.5, intensity, 'easeInOutSine')
      .setFrames(Math.floor(duration / 16)) // Convert ms to frames
      .repeat(infinite ? -1 : 0)
      .onUpdate((values) => {
        const currentIntensity = values[0];
        const glowSize = 10 * currentIntensity;
        element.style.boxShadow = `0 0 ${glowSize}px ${color}`;
        element.style.setProperty('--glow-intensity', currentIntensity.toString());
      })
      .start(element);

    this.trackAnimation(element, motion);
    return motion;
  }

  /**
   * Create scanning line effect
   */
  createScanningLine(element: HTMLElement, options: {
    color?: string;
    speed?: number;
    opacity?: number;
  } = {}): Motion | null {
    if (!this.effectsEnabled || !element) return null;

    const {
      color = 'rgba(0, 240, 255, 0.5)',
      speed = 3000,
      opacity = 0.3,
    } = options;

    // Create scanning line element
    const scanLine = document.createElement('div');
    scanLine.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, ${color}, transparent);
      opacity: ${opacity};
      pointer-events: none;
      z-index: 1;
    `;

    element.style.position = element.style.position || 'relative';
    element.appendChild(scanLine);

    const motion = createMotion()
      .setAnimation(-2, element.offsetHeight + 2, 'linear')
      .setFrames(Math.floor(speed / 16))
      .repeat(-1)
      .onUpdate((values) => {
        const y = values[0];
        scanLine.style.transform = `translateY(${y}px)`;
      })
      .onComplete(() => {
        element.removeChild(scanLine);
      })
      .start();

    this.trackAnimation(element, motion);
    return motion;
  }

  /**
   * Create holographic flicker effect
   */
  createHolographicFlicker(element: HTMLElement, options: {
    intensity?: number;
    frequency?: number;
    duration?: number;
  } = {}): Motion | null {
    if (!this.effectsEnabled || !element) return null;

    const {
      intensity = 0.05,
      frequency = 0.1,
      duration = 150,
    } = options;

    // Random flicker trigger
    const shouldFlicker = Math.random() < frequency;
    if (!shouldFlicker) {
      // Schedule next check using global runner system
      delay(() => this.createHolographicFlicker(element, options), Math.floor(60 + Math.random() * 120)); // 1-2 seconds at 60fps
      return null;
    }

    const motion = createMotion()
      .setAnimation(1, 1 - intensity, 'linear')
      .setFrames(Math.floor(duration / 16))
      .onUpdate((values) => {
        const opacity = values[0];
        element.style.opacity = opacity.toString();
        
        // Add slight color shift
        const hueShift = (1 - opacity) * 10;
        element.style.filter = `hue-rotate(${hueShift}deg) contrast(${1 + (1 - opacity) * 0.2})`;
      })
      .onComplete(() => {
        element.style.opacity = '1';
        element.style.filter = '';
        
        // Schedule next flicker using global runner system
        delay(() => this.createHolographicFlicker(element, options), Math.floor(60 + Math.random() * 180)); // 1-3 seconds at 60fps
      })
      .start();

    this.trackAnimation(element, motion);
    return motion;
  }

  /**
   * Create particle field background
   */
  createParticleField(container: HTMLElement, options: {
    particleCount?: number;
    colors?: string[];
    speed?: number;
    size?: number;
  } = {}): Motion[] {
    if (!this.effectsEnabled || !container) return [];

    const {
      particleCount = 50,
      colors = ['rgba(0, 240, 255, 0.3)', 'rgba(112, 0, 255, 0.2)', 'rgba(0, 255, 136, 0.2)'],
      speed = 20000,
      size = 1,
    } = options;

    const particles: HTMLElement[] = [];
    const motions: Motion[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: -1;
      `;

      // Random starting position
      const startX = Math.random() * container.offsetWidth;
      const startY = Math.random() * container.offsetHeight;
      const endX = startX + (Math.random() - 0.5) * 200;
      const endY = startY + (Math.random() - 0.5) * 200;

      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;

      container.appendChild(particle);
      particles.push(particle);

      // Animate particle movement
      const motion = createMotion()
        .setAnimation(startX, endX, 'linear')
        .setAnimation(startY, endY, 'linear')
        .setAnimation(0.3, 0, 'easeOutQuad')
        .setFrames(Math.floor(speed / 16))
        .onUpdate((values) => {
          const x = values[0];
          const y = values[1];
          const opacity = values[2];
          
          particle.style.left = `${x}px`;
          particle.style.top = `${y}px`;
          particle.style.opacity = opacity.toString();
        })
        .onComplete(() => {
          container.removeChild(particle);
          // Create new particle to maintain count
          this.createParticleField(container, { ...options, particleCount: 1 });
        })
        .start();

      motions.push(motion);
      this.trackAnimation(container, motion);
    }

    return motions;
  }

  /**
   * Create energy wave effect
   */
  createEnergyWave(element: HTMLElement, options: {
    color?: string;
    duration?: number;
    direction?: 'horizontal' | 'vertical';
  } = {}): Motion | null {
    if (!this.effectsEnabled || !element) return null;

    const {
      color = 'rgba(0, 240, 255, 0.4)',
      duration = 1000,
      direction = 'horizontal',
    } = options;

    // Create wave element
    const wave = document.createElement('div');
    const isHorizontal = direction === 'horizontal';
    
    wave.style.cssText = `
      position: absolute;
      ${isHorizontal ? 'top: 0; bottom: 0; left: -100%; width: 100%;' : 'left: 0; right: 0; top: -100%; height: 100%;'}
      background: linear-gradient(${isHorizontal ? '90deg' : '0deg'}, transparent, ${color}, transparent);
      pointer-events: none;
      z-index: 2;
    `;

    element.style.position = element.style.position || 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(wave);

    const motion = createMotion()
      .setAnimation(isHorizontal ? -100 : -100, isHorizontal ? 200 : 200, 'easeOutQuad')
      .setFrames(Math.floor(duration / 16))
      .onUpdate((values) => {
        const position = values[0];
        if (isHorizontal) {
          wave.style.left = `${position}%`;
        } else {
          wave.style.top = `${position}%`;
        }
      })
      .onComplete(() => {
        element.removeChild(wave);
      })
      .start();

    this.trackAnimation(element, motion);
    return motion;
  }

  /**
   * Create matrix-style digital rain effect
   */
  createDigitalRain(container: HTMLElement, options: {
    characters?: string;
    columns?: number;
    speed?: number;
    color?: string;
  } = {}): Motion[] {
    if (!this.effectsEnabled || !container) return [];

    const {
      characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
      columns = 20,
      speed = 100,
      color = 'rgba(0, 255, 136, 0.8)',
    } = options;

    const motions: Motion[] = [];
    const columnWidth = container.offsetWidth / columns;

    for (let i = 0; i < columns; i++) {
      const column = document.createElement('div');
      column.style.cssText = `
        position: absolute;
        left: ${i * columnWidth}px;
        top: -100px;
        width: ${columnWidth}px;
        color: ${color};
        font-family: 'Courier New', monospace;
        font-size: 14px;
        text-align: center;
        pointer-events: none;
        z-index: -1;
      `;

      // Generate random characters
      const charCount = Math.floor(Math.random() * 10) + 5;
      for (let j = 0; j < charCount; j++) {
        const char = document.createElement('div');
        char.textContent = characters[Math.floor(Math.random() * characters.length)];
        char.style.opacity = (1 - j / charCount).toString();
        column.appendChild(char);
      }

      container.appendChild(column);

      // Animate column falling
      const motion = createMotion()
        .setAnimation(-100, container.offsetHeight + 100, 'linear')
        .setFrames(Math.floor((speed * (Math.random() + 0.5)) / 16))
        .onUpdate((values) => {
          const y = values[0];
          column.style.top = `${y}px`;
        })
        .onComplete(() => {
          container.removeChild(column);
          // Create new column to maintain effect
          this.createDigitalRain(container, { ...options, columns: 1 });
        })
        .start();

      motions.push(motion);
      this.trackAnimation(container, motion);
    }

    return motions;
  }

  /**
   * Stop all animations for an element
   */
  stopAnimations(element: HTMLElement): void {
    const animations = this.activeAnimations.get(element);
    if (animations) {
      animations.forEach(motion => motion.stop());
      this.activeAnimations.delete(element);
    }
  }

  /**
   * Stop all active animations
   */
  stopAllAnimations(): void {
    this.activeAnimations.forEach((animations) => {
      animations.forEach(motion => motion.stop());
    });
    this.activeAnimations.clear();
  }

  /**
   * Track animation for cleanup
   */
  private trackAnimation(element: HTMLElement, motion: Motion): void {
    const existing = this.activeAnimations.get(element) || [];
    existing.push(motion);
    this.activeAnimations.set(element, existing);

    // Auto-cleanup when animation completes
    motion.onComplete(() => {
      const animations = this.activeAnimations.get(element);
      if (animations) {
        const index = animations.indexOf(motion);
        if (index !== -1) {
          animations.splice(index, 1);
          if (animations.length === 0) {
            this.activeAnimations.delete(element);
          }
        }
      }
    });
  }

  /**
   * Get performance stats
   */
  getStats(): {
    activeElements: number;
    totalAnimations: number;
    effectsEnabled: boolean;
  } {
    let totalAnimations = 0;
    this.activeAnimations.forEach(animations => {
      totalAnimations += animations.length;
    });

    return {
      activeElements: this.activeAnimations.size,
      totalAnimations,
      effectsEnabled: this.effectsEnabled,
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.stopAllAnimations();
    logger.info('VisualEffects disposed', undefined, 'VisualEffects');
  }
}

// Export singleton instance
export const visualEffects = new VisualEffects();