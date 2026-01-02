/**
 * Theme System - Barrel export for enhanced sci-fi theme system
 * 
 * Exports all theme-related functionality including:
 * - SciFiThemeSystem for advanced visual effects
 * - ThemeManager for coordinated theme management
 * - VisualEffects for animation-based effects
 * - Type definitions and utilities
 */

// Core theme system
export { SciFiThemeSystem, sciFiThemeSystem, defaultSciFiTheme, themeVariants } from './SciFiThemeSystem';
export type { SciFiThemeConfig } from './SciFiThemeSystem';

// Enhanced theme manager
export { ThemeManager, themeManager } from './ThemeManager';

// Visual effects system
export { VisualEffects, visualEffects } from './effects/VisualEffects';

// Type definitions
export type { ThemeMode, AccentColor, ThemeConfig, ThemeVariant } from './types';
export { defaultThemeConfig, accentColorRGB, accentColorHex } from './types';

// Legacy theme system (for compatibility)
export { themeSystem } from '../core/ThemeSystem';
export type { ThemeSettings } from '../core/ThemeSystem';