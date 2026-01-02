/**
 * Easing Functions - 缓动函数库
 * 从Zaun_Core.js提取，保留常量优化
 */

export type EasingFunction = (t: number) => number;

/**
 * 缓动类型枚举
 */
export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInSine'
  | 'easeOutSine'
  | 'easeInOutSine'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'
  | 'easeInCirc'
  | 'easeOutCirc'
  | 'easeInOutCirc'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce';

// ============ 预计算常量（避免运行时计算） ============
const HALF_PI = Math.PI / 2;
const PI2 = Math.PI * 2;
const ELASTIC_P = 0.3;
const ELASTIC_P4 = 0.3 / 4;
const BOUNCE_D1 = 1 / 2.75;
const BOUNCE_D2 = 2 / 2.75;
const BOUNCE_D3 = 1.5 / 2.75;
const BOUNCE_D4 = 2.25 / 2.75;
const BOUNCE_D5 = 2.5 / 2.75;
const BOUNCE_D6 = 2.625 / 2.75;
const BOUNCE_N1 = 7.5625;
const BACK_S = 1.70158;
const BACK_SS = 1.70158 * 1.525;

/**
 * 缓动函数集合 - 使用预计算常量优化
 */
export const EasingFunctions: Record<EasingType, EasingFunction> = {
  // 线性
  linear: (t: number): number => t,

  // 二次方曲线
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // 三次方曲线
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => {
    t--;
    return t * t * t + 1;
  },
  easeInOutCubic: (t: number): number => {
    if (t < 0.5) return 4 * t * t * t;
    t--;
    return (t) * (2 * t - 2) * (2 * t - 2) + 1;
  },

  // 四次方曲线
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => {
    t--;
    return 1 - t * t * t * t;
  },
  easeInOutQuart: (t: number): number => {
    if (t < 0.5) return 8 * t * t * t * t;
    t--;
    return 1 - 8 * t * t * t * t;
  },

  // 正弦曲线
  easeInSine: (t: number): number => 1 - Math.cos(t * HALF_PI),
  easeOutSine: (t: number): number => Math.sin(t * HALF_PI),
  easeInOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,

  // 指数曲线
  easeInExpo: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    t *= 2;
    if (t <= 1) return Math.pow(2, 10 * (t - 1)) / 2;
    return (2 - Math.pow(2, -10 * (t - 1))) / 2;
  },

  // 圆形曲线
  easeInCirc: (t: number): number => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number): number => {
    t--;
    return Math.sqrt(1 - t * t);
  },
  easeInOutCirc: (t: number): number => {
    t *= 2;
    if (t <= 1) return (1 - Math.sqrt(1 - t * t)) / 2;
    t -= 2;
    return (Math.sqrt(1 - t * t) + 1) / 2;
  },

  // 弹性曲线
  easeInElastic: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    t -= 1;
    return -Math.pow(2, 10 * t) * Math.sin((t - ELASTIC_P4) * PI2 / ELASTIC_P);
  },
  easeOutElastic: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t - ELASTIC_P4) * PI2 / ELASTIC_P) + 1;
  },
  easeInOutElastic: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    t *= 2;
    if (t < 1) {
      t -= 1;
      return -0.5 * Math.pow(2, 10 * t) * Math.sin((t - ELASTIC_P4) * PI2 / ELASTIC_P);
    }
    t -= 1;
    return Math.pow(2, -10 * t) * Math.sin((t - ELASTIC_P4) * PI2 / ELASTIC_P) * 0.5 + 1;
  },

  // 回弹曲线
  easeInBack: (t: number): number => {
    return t === 1 ? 1 : t * t * ((BACK_S + 1) * t - BACK_S);
  },
  easeOutBack: (t: number): number => {
    if (t === 0) return 0;
    t--;
    return t * t * ((BACK_S + 1) * t + BACK_S) + 1;
  },
  easeInOutBack: (t: number): number => {
    t *= 2;
    if (t < 1) {
      return 0.5 * (t * t * ((BACK_SS + 1) * t - BACK_SS));
    }
    t -= 2;
    return 0.5 * (t * t * ((BACK_SS + 1) * t + BACK_SS) + 2);
  },

  // 弹跳曲线
  easeInBounce: (t: number): number => 1 - EasingFunctions.easeOutBounce(1 - t),
  easeOutBounce: (t: number): number => {
    if (t < BOUNCE_D1) return BOUNCE_N1 * t * t;
    if (t < BOUNCE_D2) {
      t -= BOUNCE_D3;
      return BOUNCE_N1 * t * t + 0.75;
    }
    if (t < BOUNCE_D5) {
      t -= BOUNCE_D4;
      return BOUNCE_N1 * t * t + 0.9375;
    }
    t -= BOUNCE_D6;
    return BOUNCE_N1 * t * t + 0.984375;
  },
  easeInOutBounce: (t: number): number => {
    if (t < 0.5) {
      return EasingFunctions.easeInBounce(t * 2) * 0.5;
    }
    return EasingFunctions.easeOutBounce(t * 2 - 1) * 0.5 + 0.5;
  },
};

/**
 * 获取缓动函数
 */
export function getEasing(type: EasingType): EasingFunction {
  return EasingFunctions[type] || EasingFunctions.linear;
}

const EasingFunctionLists = Object.keys(EasingFunctions);
/**
 * 获取所有缓动类型列表
 */
export function getEasingTypes(): EasingType[] {
  return EasingFunctionLists as EasingType[];
}

// 导出常量供外部使用
export const EasingConstants = {
  HALF_PI,
  PI2,
  ELASTIC_P,
  ELASTIC_P4,
  BOUNCE_D1,
  BOUNCE_N1,
  BACK_S,
  BACK_SS,
} as const;

export default EasingFunctions;
