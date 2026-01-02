/**
 * Theme System Types - 主题系统类型定义
 * Requirements: 5.4, 5.5, 16.6
 */

// Theme mode
export type ThemeMode = 'dark' | 'light';

// Accent color options
export type AccentColor = 'cyan' | 'magenta' | 'green' | 'orange';

// Theme configuration
export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: AccentColor;
  animationsEnabled: boolean;
  particleBackground: boolean;
  scanlineEffect: boolean;
  glowIntensity: number; // 0-1
  gridBackground: boolean;
}

// Default theme configuration
export const defaultThemeConfig: ThemeConfig = {
  mode: 'dark',
  accentColor: 'cyan',
  animationsEnabled: true,
  particleBackground: true,
  scanlineEffect: false,
  glowIntensity: 0.7,
  gridBackground: true,
};

// Accent color RGB values for CSS variables
export const accentColorRGB: Record<AccentColor, string> = {
  cyan: '0, 240, 255',
  magenta: '255, 0, 255',
  green: '0, 255, 136',
  orange: '255, 136, 0',
};

// Accent color hex values
export const accentColorHex: Record<AccentColor, string> = {
  cyan: '#00f0ff',
  magenta: '#ff00ff',
  green: '#00ff88',
  orange: '#ff8800',
};

// Theme variant types for UI elements
export type ThemeVariant = 'primary' | 'secondary' | 'accent' | 'warning' | 'success' | 'error';
