/**
 * Math Utilities - 数学工具函数和向量类
 * 从Zaun_Core.js提取，使用类和预设对象避免GC
 */

// ============ 预计算常量 ============
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const HALF_PI = Math.PI / 2;
export const TWO_PI = Math.PI * 2;

// ============ 基础数学函数 ============

/**
 * 限制数值在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * 取模运算（处理负数）
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * 生成指定范围内的随机整数
 */
export function randomInt(max: number): number {
  return (max * Math.random()) | 0;
}

/**
 * 生成指定范围内的随机整数（闭区间）
 */
export function randomRange(min: number, max: number): number {
  return ((Math.random() * (max - min + 1)) | 0) + min;
}

/**
 * 检查是否为2的幂
 */
export function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

/**
 * 角度转弧度
 */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * 弧度转角度
 */
export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

/**
 * 线性插值
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * 数字格式化（补零）
 */
export function padZero(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * 格式化数字（两位数补零）
 */
export function formatNum(num: number): string {
  return num < 10 ? '0' + num : String(num);
}

// ============ Vector2 类 ============

/**
 * 2D向量类 - 可变对象，避免每次计算创建新对象
 * 使用方法链式调用，修改自身并返回this
 */
export class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * 设置向量值
   */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * 从另一个向量复制
   */
  copyFrom(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /**
   * 复制到另一个向量
   */
  copyTo(v: Vector2): Vector2 {
    v.x = this.x;
    v.y = this.y;
    return v;
  }

  /**
   * 克隆向量（创建新对象）
   */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * 重置为零向量
   */
  reset(): this {
    this.x = 0;
    this.y = 0;
    return this;
  }

  /**
   * 向量加法（修改自身）
   */
  add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * 向量加法（输出到目标向量）
   */
  addTo(v: Vector2, out: Vector2): Vector2 {
    out.x = this.x + v.x;
    out.y = this.y + v.y;
    return out;
  }

  /**
   * 向量减法（修改自身）
   */
  sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * 向量减法（输出到目标向量）
   */
  subTo(v: Vector2, out: Vector2): Vector2 {
    out.x = this.x - v.x;
    out.y = this.y - v.y;
    return out;
  }

  /**
   * 向量缩放（修改自身）
   */
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /**
   * 向量缩放（输出到目标向量）
   */
  scaleTo(s: number, out: Vector2): Vector2 {
    out.x = this.x * s;
    out.y = this.y * s;
    return out;
  }

  /**
   * 向量长度
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * 向量长度的平方（避免开方运算）
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * 归一化（修改自身）
   */
  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /**
   * 归一化（输出到目标向量）
   */
  normalizeTo(out: Vector2): Vector2 {
    const len = this.length();
    if (len > 0) {
      out.x = this.x / len;
      out.y = this.y / len;
    } else {
      out.x = 0;
      out.y = 0;
    }
    return out;
  }

  /**
   * 点积
   */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * 叉积（2D返回标量）
   */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * 计算到另一个向量的距离
   */
  distanceTo(v: Vector2): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算到另一个向量的距离平方
   */
  distanceToSquared(v: Vector2): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return dx * dx + dy * dy;
  }

  /**
   * 计算到另一个向量的角度（弧度）
   */
  angleTo(v: Vector2): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  /**
   * 线性插值（修改自身）
   */
  lerp(v: Vector2, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /**
   * 线性插值（输出到目标向量）
   */
  lerpTo(v: Vector2, t: number, out: Vector2): Vector2 {
    out.x = this.x + (v.x - this.x) * t;
    out.y = this.y + (v.y - this.y) * t;
    return out;
  }

  /**
   * 旋转向量（修改自身）
   */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x;
    const y = this.y;
    this.x = x * cos - y * sin;
    this.y = x * sin + y * cos;
    return this;
  }

  /**
   * 取反（修改自身）
   */
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /**
   * 检查是否相等
   */
  equals(v: Vector2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /**
   * 检查是否近似相等
   */
  equalsEpsilon(v: Vector2, epsilon: number = 0.0001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /**
   * 转换为数组
   */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /**
   * 从数组设置
   */
  fromArray(arr: [number, number]): this {
    this.x = arr[0];
    this.y = arr[1];
    return this;
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  // ============ 静态预设对象（避免创建新对象） ============

  /** 临时向量1 - 用于中间计算 */
  static readonly temp1 = new Vector2();
  /** 临时向量2 - 用于中间计算 */
  static readonly temp2 = new Vector2();
  /** 临时向量3 - 用于中间计算 */
  static readonly temp3 = new Vector2();
  /** 共享向量 - 用于返回结果 */
  static readonly shared = new Vector2();
  /** 零向量 */
  static readonly ZERO = Object.freeze(new Vector2(0, 0));
  /** 单位向量 */
  static readonly ONE = Object.freeze(new Vector2(1, 1));
  /** 向上向量 */
  static readonly UP = Object.freeze(new Vector2(0, -1));
  /** 向下向量 */
  static readonly DOWN = Object.freeze(new Vector2(0, 1));
  /** 向左向量 */
  static readonly LEFT = Object.freeze(new Vector2(-1, 0));
  /** 向右向量 */
  static readonly RIGHT = Object.freeze(new Vector2(1, 0));

  // ============ 静态工厂方法 ============

  /**
   * 从角度创建单位向量
   */
  static fromAngle(angle: number, out?: Vector2): Vector2 {
    const v = out || new Vector2();
    v.x = Math.cos(angle);
    v.y = Math.sin(angle);
    return v;
  }

  /**
   * 从两点创建向量
   */
  static fromPoints(x1: number, y1: number, x2: number, y2: number, out?: Vector2): Vector2 {
    const v = out || new Vector2();
    v.x = x2 - x1;
    v.y = y2 - y1;
    return v;
  }

  /**
   * 计算两点之间的距离
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两点之间的角度
   */
  static angle(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
  }
}

// ============ 便捷函数（使用预设对象） ============

/**
 * 计算两点之间的距离
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Vector2.distance(x1, y1, x2, y2);
}

/**
 * 计算两点之间的角度（弧度）
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Vector2.angle(x1, y1, x2, y2);
}

/**
 * 计算两点之间的角度（角度）
 */
export function angleDeg(x1: number, y1: number, x2: number, y2: number): number {
  return Vector2.angle(x1, y1, x2, y2) * RAD_TO_DEG;
}
