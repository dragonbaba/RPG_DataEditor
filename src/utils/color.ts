/**
 * Color Utilities - 颜色工具类
 * 从Zaun_Core.js提取，使用Float32Array和查找表优化
 */

// ============ 预计算查找表（避免运行时除法） ============

/** 0-255 除以 255 的查找表 */
export const div255Table: Float32Array = (() => {
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    table[i] = i / 255;
  }
  return table;
})();

/** 0-359 除以 360 的查找表 */
export const div360Table: Float32Array = (() => {
  const table = new Float32Array(360);
  for (let i = 0; i < 360; i++) {
    table[i] = i / 360;
  }
  return table;
})();

/** 十六进制字符表 */
const hexTable: string[] = (() => {
  const table: string[] = new Array(256);
  const chars = '0123456789abcdef';
  for (let i = 0; i < 256; i++) {
    table[i] = chars[(i >> 4) & 0xf] + chars[i & 0xf];
  }
  return table;
})();

// ============ 预设输出对象（避免创建新对象） ============

/** RGBA输出对象 */
const outputRGBA = { r: 0, g: 0, b: 0, a: 0 };

/** HSLA输出对象 */
const outputHSLA = { h: 0, s: 0, l: 0, a: 0 };

/** HSVA输出对象 */
const outputHSVA = { h: 0, s: 0, v: 0, a: 0 };

/** 默认白色 */
const whiteColor = [1, 1, 1, 1];

// ============ 正则表达式 ============

const rgbaRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/;
const hexTestRegex = /^[0-9A-Fa-f]{3,8}$/;

// ============ 辅助函数 ============

/**
 * 数字转两位十六进制（使用查找表）
 */
export function hex(value: number): string {
  return hexTable[value & 255];
}

/**
 * HSL转RGB辅助函数
 */
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

// ============ RGBA/HSLA 接口 ============

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface HSVA {
  h: number;
  s: number;
  v: number;
  a: number;
}

// ============ Color 类 ============

/**
 * Color类 - 继承Float32Array，存储归一化RGBA值(0-1)
 * 使用查找表和预设对象优化性能
 */
export class Color extends Float32Array {
  /** 预定义颜色名称 */
  static readonly NAMED_COLORS: Record<string, { r: number; g: number; b: number; a?: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
    orange: { r: 255, g: 165, b: 0 },
    purple: { r: 128, g: 0, b: 128 },
    pink: { r: 255, g: 192, b: 203 },
    brown: { r: 165, g: 42, b: 42 },
    lime: { r: 0, g: 255, b: 0 },
    navy: { r: 0, g: 0, b: 128 },
    teal: { r: 0, g: 128, b: 128 },
    olive: { r: 128, g: 128, b: 0 },
    maroon: { r: 128, g: 0, b: 0 },
    aqua: { r: 0, g: 255, b: 255 },
    fuchsia: { r: 255, g: 0, b: 255 },
    silver: { r: 192, g: 192, b: 192 },
    gold: { r: 255, g: 215, b: 0 },
  };

  /** 临时颜色对象 - 用于中间计算 */
  static temp: Color;
  /** 共享颜色对象 - 用于返回结果 */
  static shared: Color;

  constructor(value?: Color | number | string | number[] | Float32Array | RGBA | HSLA | HSVA) {
    super(whiteColor);
    if (value != null) {
      this.setValue(value);
    }
  }

  /**
   * 设置颜色值（支持多种输入格式）
   */
  setValue(value: Color | number | string | number[] | Float32Array | RGBA | HSLA | HSVA): this {
    if (value instanceof Color) {
      return this.copyFrom(value);
    }
    if (typeof value === 'number') {
      return this.setFromNumber(value);
    }
    if (Array.isArray(value) || value instanceof Float32Array) {
      return this.setFromArray(value as number[]);
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (Color.NAMED_COLORS[lowerValue]) {
        return this.setFromColorName(value);
      }
      if (value.startsWith('#')) {
        return this.setFromHex(value);
      }
      if (value.startsWith('rgb')) {
        return this.setFromRGBAString(value);
      }
    }
    if (value && typeof value === 'object') {
      if ('r' in value && 'g' in value && 'b' in value) {
        const rgba = value as RGBA;
        this[0] = rgba.r / 255;
        this[1] = rgba.g / 255;
        this[2] = rgba.b / 255;
        this[3] = rgba.a !== undefined ? rgba.a : 1;
        return this;
      }
      if ('h' in value && 's' in value && 'l' in value) {
        const hsla = value as HSLA;
        if (hsla.a !== undefined) this[3] = hsla.a;
        this.setHSL(hsla.h, hsla.s, hsla.l);
        return this;
      }
      if ('h' in value && 's' in value && 'v' in value) {
        const hsva = value as HSVA;
        if (hsva.a !== undefined) this[3] = hsva.a;
        this.setHSV(hsva.h, hsva.s, hsva.v);
        return this;
      }
    }
    console.error(`Unable to convert color ${value}`);
    return this;
  }

  /**
   * 设置透明度
   */
  setAlpha(alpha: number): this {
    this[3] = alpha;
    return this;
  }

  /**
   * 转换为数字颜色值 (0xRRGGBB)
   */
  toNumber(): number {
    return ((this[0] * 255) << 16) | ((this[1] * 255) << 8) | (this[2] * 255);
  }

  /**
   * 转换为BGR数字颜色值
   */
  toBgrNumber(): number {
    const r = this[0] * 255;
    const g = this[1] * 255;
    const b = this[2] * 255;
    return (b << 16) | (g << 8) | r;
  }

  /**
   * 颜色相乘
   */
  multiply(value: Color | string | number | number[]): this {
    const sourceArray = Color.temp.setValue(value);
    this[0] *= sourceArray[0];
    this[1] *= sourceArray[1];
    this[2] *= sourceArray[2];
    this[3] *= sourceArray[3];
    sourceArray.reset();
    return this;
  }

  /**
   * 预乘透明度
   */
  premultiply(alpha: number, applyToRGB: boolean = true): this {
    if (applyToRGB) {
      this[0] *= alpha;
      this[1] *= alpha;
      this[2] *= alpha;
    }
    this[3] = alpha;
    return this;
  }

  /**
   * 从十六进制字符串设置颜色
   */
  setFromHex(hexString: string): this {
    Color.fromHex(hexString, this);
    return this;
  }

  /**
   * 从RGBA字符串设置颜色
   */
  setFromRGBAString(rgbString: string): this {
    Color.fromRGBA(rgbString, this);
    return this;
  }

  /**
   * 从数字值设置颜色 (0xRRGGBB)
   */
  setFromNumber(num: number): this {
    if (num < 0 || num > 16777215) {
      console.error(`Unable to convert color ${num}`);
      return this;
    }
    this[0] = div255Table[num >>> 16];
    this[1] = div255Table[(num >>> 8) & 255];
    this[2] = div255Table[num & 255];
    this[3] = 1;
    return this;
  }

  /**
   * 从数组设置颜色 (0-255)
   */
  setFromArray(array: number[]): this {
    if (array.length < 3) {
      console.error(`Unable to convert color ${array}`);
      return this;
    }
    this[0] = div255Table[array[0] & 255];
    this[1] = div255Table[array[1] & 255];
    this[2] = div255Table[array[2] & 255];
    this[3] = array.length >= 4 ? div255Table[array[3] & 255] : 1;
    return this;
  }

  /**
   * 从颜色名称设置颜色
   */
  setFromColorName(colorName: string): this {
    const color = Color.NAMED_COLORS[colorName.toLowerCase()];
    if (color === undefined) {
      console.error(`Unable to convert color ${colorName}`);
      return this;
    }
    return this.setRGBA(color.r, color.g, color.b, color.a ?? 255);
  }

  /**
   * 设置RGBA值 (0-255)
   */
  setRGBA(r: number, g: number, b: number, a: number = 255): this {
    this[0] = div255Table[r & 255];
    this[1] = div255Table[g & 255];
    this[2] = div255Table[b & 255];
    this[3] = div255Table[a & 255];
    return this;
  }

  /**
   * 设置RGBA值 (0-1)
   */
  setRGBAFloat(r: number, g: number, b: number, a: number = 1): this {
    this[0] = r;
    this[1] = g;
    this[2] = b;
    this[3] = a;
    return this;
  }

  /**
   * 获取RGBA值 (0-255)
   */
  getRGBA(): RGBA {
    outputRGBA.r = (this[0] * 255) & 255;
    outputRGBA.g = (this[1] * 255) & 255;
    outputRGBA.b = (this[2] * 255) & 255;
    outputRGBA.a = (this[3] * 255) & 255;
    return outputRGBA;
  }

  /**
   * 获取RGBA值 (0-1)
   */
  getRGBAFloat(): RGBA {
    outputRGBA.r = this[0];
    outputRGBA.g = this[1];
    outputRGBA.b = this[2];
    outputRGBA.a = this[3];
    return outputRGBA;
  }

  /**
   * 转换为十六进制字符串
   */
  toHex(): string {
    const r = this[0] * 255;
    const g = this[1] * 255;
    const b = this[2] * 255;
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  /**
   * 转换为带透明度的十六进制字符串
   */
  toHexWithAlpha(): string {
    const r = this[0] * 255;
    const g = this[1] * 255;
    const b = this[2] * 255;
    const a = this[3] * 255;
    return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
  }

  /**
   * 转换为RGB字符串
   */
  toRGB(): string {
    const r = (this[0] * 255) & 255;
    const g = (this[1] * 255) & 255;
    const b = (this[2] * 255) & 255;
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 转换为RGBA字符串
   */
  toRGBA(): string {
    const r = (this[0] * 255) & 255;
    const g = (this[1] * 255) & 255;
    const b = (this[2] * 255) & 255;
    const a = this[3];
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /**
   * 转换为HSL
   */
  toHSL(): HSLA {
    const r = this[0];
    const g = this[1];
    const b = this[2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    outputHSLA.h = h * 360;
    outputHSLA.s = s * 100;
    outputHSLA.l = l * 100;
    outputHSLA.a = this[3];
    return outputHSLA;
  }

  /**
   * 从HSL设置颜色
   * @param h 色调 (0-360)
   * @param s 饱和度 (0-100)
   * @param l 亮度 (0-100)
   */
  setHSL(h: number, s: number, l: number): Color {
    h = (h % 360) / 360;
    s = Math.max(0, Math.min(1, s / 100));
    l = Math.max(0, Math.min(1, l / 100));

    if (s === 0) {
      this[0] = this[1] = this[2] = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      this[0] = hue2rgb(p, q, h + 1 / 3);
      this[1] = hue2rgb(p, q, h);
      this[2] = hue2rgb(p, q, h - 1 / 3);
    }
    return this;
  }

  /**
   * 转换为HSV
   */
  toHSV(): HSVA {
    const r = this[0];
    const g = this[1];
    const b = this[2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    outputHSVA.h = h * 360;
    outputHSVA.s = s * 100;
    outputHSVA.v = v * 100;
    outputHSVA.a = this[3];
    return outputHSVA;
  }

  /**
   * 从HSV设置颜色
   * @param h 色调 (0-360)
   * @param s 饱和度 (0-100)
   * @param v 明度 (0-100)
   */
  setHSV(h: number, s: number, v: number): Color {
    h = (h % 360) / 360;
    s = Math.max(0, Math.min(1, s / 100));
    v = Math.max(0, Math.min(1, v / 100));

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        this[0] = v;
        this[1] = t;
        this[2] = p;
        break;
      case 1:
        this[0] = q;
        this[1] = v;
        this[2] = p;
        break;
      case 2:
        this[0] = p;
        this[1] = v;
        this[2] = t;
        break;
      case 3:
        this[0] = p;
        this[1] = q;
        this[2] = v;
        break;
      case 4:
        this[0] = t;
        this[1] = p;
        this[2] = v;
        break;
      case 5:
        this[0] = v;
        this[1] = p;
        this[2] = q;
        break;
    }
    return this;
  }

  /**
   * 混合颜色
   */
  blend(otherColor: Color, factor: number = 0.5): this {
    this[0] = this[0] * (1 - factor) + otherColor[0] * factor;
    this[1] = this[1] * (1 - factor) + otherColor[1] * factor;
    this[2] = this[2] * (1 - factor) + otherColor[2] * factor;
    this[3] = this[3] * (1 - factor) + otherColor[3] * factor;
    return this;
  }

  /**
   * 反转颜色
   */
  invert(): this {
    this[0] = 1 - this[0];
    this[1] = 1 - this[1];
    this[2] = 1 - this[2];
    return this;
  }

  /**
   * 调整亮度
   */
  adjustBrightness(factor: number): this {
    this[0] = Math.max(0, Math.min(1, this[0] * factor));
    this[1] = Math.max(0, Math.min(1, this[1] * factor));
    this[2] = Math.max(0, Math.min(1, this[2] * factor));
    return this;
  }

  /**
   * 克隆颜色
   */
  clone(): Color {
    const newColor = new Color();
    newColor[0] = this[0];
    newColor[1] = this[1];
    newColor[2] = this[2];
    newColor[3] = this[3];
    return newColor;
  }

  /**
   * 从另一个颜色复制
   */
  copyFrom(otherColor: Color): this {
    this[0] = otherColor[0];
    this[1] = otherColor[1];
    this[2] = otherColor[2];
    this[3] = otherColor[3];
    return this;
  }

  /**
   * 复制到另一个颜色
   */
  copyTo(otherColor: Color): Color {
    otherColor[0] = this[0];
    otherColor[1] = this[1];
    otherColor[2] = this[2];
    otherColor[3] = this[3];
    return otherColor;
  }

  /**
   * 重置为白色（用于对象池）
   */
  reset(): this {
    this[0] = whiteColor[0];
    this[1] = whiteColor[1];
    this[2] = whiteColor[2];
    this[3] = whiteColor[3];
    return this;
  }

  /**
   * 检查两个颜色是否相等
   */
  equals(otherColor: Color): boolean {
    return (
      this[0] === otherColor[0] &&
      this[1] === otherColor[1] &&
      this[2] === otherColor[2] &&
      this[3] === otherColor[3]
    );
  }

  // ============ 静态方法 ============

  /**
   * 从十六进制字符串创建颜色
   */
  static fromHex(hexString: string, targetColor: Color = new Color()): Color {
    if (typeof hexString !== 'string') {
      console.error('Color.fromHex: hexString must be a string');
      return targetColor;
    }

    const hexChar0 = hexString.charAt(0);
    const isHex = hexChar0 === '#' || hexString.startsWith('0x');
    let hex = isHex ? hexString.slice(hexChar0 === '#' ? 1 : 2) : hexString;

    if (!hexTestRegex.test(hex)) {
      console.error('Color.fromHex: Invalid hex string format');
      return targetColor;
    }

    if (hex.length === 3) {
      hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }

    const value = parseInt(hex, 16);
    let r: number, g: number, b: number, a: number;

    if (hex.length === 6) {
      r = div255Table[(value >> 16) & 255];
      g = div255Table[(value >> 8) & 255];
      b = div255Table[value & 255];
      a = 1;
    } else if (hex.length === 8) {
      r = div255Table[(value >> 24) & 255];
      g = div255Table[(value >> 16) & 255];
      b = div255Table[(value >> 8) & 255];
      a = div255Table[value & 255];
    } else {
      console.error('Color.fromHex: Unsupported hex string length');
      return targetColor;
    }

    return targetColor.setRGBAFloat(r, g, b, a);
  }

  /**
   * 从RGBA字符串创建颜色
   */
  static fromRGBA(rgbString: string, targetColor: Color = new Color()): Color {
    const match = rgbString.match(rgbaRegex);
    if (match) {
      const r = div255Table[parseInt(match[1])];
      const g = div255Table[parseInt(match[2])];
      const b = div255Table[parseInt(match[3])];
      const a = match[4] ? parseFloat(match[4]) : 1;
      return targetColor.setRGBAFloat(r, g, b, a);
    }
    console.error('Color.fromRGBA: Invalid RGBA string format');
    return targetColor;
  }
}

// 初始化静态预设对象
Color.temp = new Color();
Color.shared = new Color();

// ============ 便捷函数 ============

/**
 * 解析颜色字符串或数字
 */
export function parseColor(color: string | number): Color {
  return new Color(color);
}

/**
 * RGB转十六进制字符串
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * 数字颜色转十六进制字符串
 */
export function numberToHex(color: number): string {
  return `#${hex((color >> 16) & 255)}${hex((color >> 8) & 255)}${hex(color & 255)}`;
}

/**
 * 十六进制字符串转数字颜色
 */
export function hexToNumber(hexString: string): number {
  const color = Color.temp.setFromHex(hexString);
  const result = color.toNumber();
  color.reset();
  return result;
}

export default Color;
