/**
 * Animation System - 动画系统
 * 从Zaun_Core.js提取，使用Float32Array和对象池优化性能
 */

import { EasingFunctions, EasingType, EasingFunction } from './easing';

// ============ 对象池 ============

/**
 * 简单对象池 - 避免频繁创建/销毁对象
 */
class Pool<T extends { reset(): void }> {
  private pool: T[] = [];
  private index = 0;
  private readonly factory: () => T;
  
  constructor(factory: () => T, initialSize = 100) {
    this.factory = factory;
    // 预分配
    for (let i = 0; i < initialSize; i++) {
      this.pool[i] = factory();
    }
    this.index = initialSize;
  }
  
  get(): T {
    if (this.index > 0) {
      return this.pool[--this.index];
    }
    return this.factory();
  }
  
  return(item: T): void {
    item.reset();
    this.pool[this.index++] = item;
  }
}

// ============ MotionCommand ============

/**
 * 动画命令 - 存储单个动画阶段的属性变化
 * 使用Float32Array存储最多8个动画属性，避免GC
 */
export class MotionCommand {
  /** 起始值数组 (最多8个) */
  readonly startValues = new Float32Array(8);
  /** 变化值数组 (endValue - startValue) */
  readonly changeValues = new Float32Array(8);
  /** 结果值数组 (计算后的当前值) */
  readonly resultValues = new Float32Array(8);
  /** 缓动函数数组 */
  readonly easingFuncs: EasingFunction[] = [];
  /** 当前属性数量 */
  count = 0;
  /** 总帧数 */
  totalFrames = 0;
  /** 更新回调键 */
  updateKey = '';
  
  /**
   * 重置命令状态
   */
  reset(): void {
    this.easingFuncs.length = 0;
    this.count = 0;
    this.totalFrames = 0;
    this.updateKey = '';
  }
  
  /**
   * 添加动画属性
   * @param startValue 起始值
   * @param endValue 结束值
   * @param easing 缓动类型
   */
  setAnimation(startValue: number, endValue: number, easing: EasingType = 'linear'): this {
    if (this.count >= 8) {
      console.warn('MotionCommand: 最多只能存储8个动画属性');
      return this;
    }
    const count = this.count;
    this.startValues[count] = startValue;
    this.changeValues[count] = endValue - startValue;
    this.easingFuncs[count] = EasingFunctions[easing];
    this.count++;
    return this;
  }
  
  /**
   * 设置帧数
   */
  setFrames(frames = 60): this {
    this.totalFrames = frames;
    return this;
  }
  
  /**
   * 设置更新回调键
   */
  onUpdate(funcKey: string): this {
    this.updateKey = funcKey;
    return this;
  }
}

// ============ Motion ============

/** 更新回调类型 */
export type MotionUpdateCallback = (values: Float32Array, target?: any) => void;
/** 完成回调类型 */
export type MotionCompleteCallback = () => void;

/**
 * 动画实例 - 管理多个动画命令的执行
 */
export class Motion {
  /** 命令列表 */
  readonly commands: MotionCommand[] = [];
  /** 命令数量 */
  commandSize = 0;
  /** 当前命令索引 */
  index = 0;
  /** 当前命令 */
  currentCommand: MotionCommand | null = null;
  
  /** 当前帧 */
  currentFrame = 0;
  /** 总帧数 (当前命令) */
  totalFrames = 0;
  /** 属性数量 (当前命令) */
  count = 0;
  
  /** 当前命令的值引用 (避免每帧查找) */
  private startValues: Float32Array | null = null;
  private changeValues: Float32Array | null = null;
  private resultValues: Float32Array | null = null;
  private easingFuncs: EasingFunction[] | null = null;
  
  /** 更新回调 */
  private updateCallback: MotionUpdateCallback | null = null;
  /** 完成回调 */
  private completeCallback: MotionCompleteCallback | null = null;
  
  /** 是否反向播放 */
  yoyo = false;
  /** 是否保留(用于yoyo) */
  reserved = false;
  /** 重复次数 */
  repeatTime = 0;
  /** 是否自动返回池 */
  isReturnToPool = true;
  /** 是否正在运行 */
  isRunning = false;
  /** 绑定的目标对象 */
  target: unknown = null;
  
  /**
   * 创建新命令
   */
  newCommand(): this {
    if (this.currentCommand !== null) {
      console.warn('Motion: 当前已存在缓动指令，请先调用endCommand');
      return this;
    }
    this.currentCommand = commandPool.get();
    this.commands[this.commandSize++] = this.currentCommand;
    return this;
  }
  
  /**
   * 结束当前命令
   */
  endCommand(): this {
    this.currentCommand = null;
    return this;
  }
  
  /**
   * 检查并创建命令
   */
  private checkCommand(): this {
    if (this.currentCommand === null) {
      return this.newCommand();
    }
    return this;
  }
  
  /**
   * 添加动画属性
   */
  setAnimation(startValue: number, endValue: number, easing: EasingType = 'linear'): this {
    this.checkCommand().currentCommand!.setAnimation(startValue, endValue, easing);
    return this;
  }
  
  /**
   * 设置帧数
   */
  setFrames(frames = 60): this {
    this.checkCommand().currentCommand!.setFrames(frames);
    return this;
  }
  
  /**
   * 设置更新回调
   */
  onUpdate(callback: MotionUpdateCallback): this {
    this.updateCallback = callback;
    return this;
  }
  
  /**
   * 设置完成回调
   */
  onComplete(callback: MotionCompleteCallback): this {
    this.completeCallback = callback;
    return this;
  }
  
  /**
   * 设置是否反向播放
   */
  reserve(reserve = true): this {
    this.reserved = reserve;
    return this;
  }
  
  /**
   * 设置重复次数
   */
  repeat(times = 1): this {
    this.repeatTime = times;
    return this;
  }
  
  /**
   * 设置是否自动返回池
   */
  autoReturn(isReturn = true): this {
    this.isReturnToPool = isReturn;
    return this;
  }
  
  /**
   * 开始动画
   */
  start(target?: unknown): this {
    this.target = target;
    this.endCommand();
    this.isRunning = true;
    const command = this.getNextCommand();
    if (command) {
      this.setCommandStates(command);
    }
    return this;
  }
  
  /**
   * 设置当前命令状态
   */
  private setCommandStates(command: MotionCommand): void {
    this.startValues = command.startValues;
    this.changeValues = command.changeValues;
    this.resultValues = command.resultValues;
    this.easingFuncs = command.easingFuncs;
    this.totalFrames = command.totalFrames;
    this.count = command.count;
    this.currentFrame = 0;
  }
  
  /**
   * 获取下一个命令
   */
  private getNextCommand(): MotionCommand | null {
    if (this.index < this.commandSize) {
      return this.commands[this.index++];
    }
    return null;
  }
  
  /**
   * 获取上一个命令
   */
  private getPreviousCommand(): MotionCommand | null {
    if (this.index > 0) {
      return this.commands[--this.index];
    }
    return null;
  }
  
  /**
   * 执行一帧动画
   */
  animate(): void {
    if (!this.isRunning) return;
    
    if (this.currentFrame < this.totalFrames) {
      this.currentFrame++;
      const progress = this.currentFrame / this.totalFrames;
      const startValues = this.startValues!;
      const changeValues = this.changeValues!;
      const resultValues = this.resultValues!;
      const easingFuncs = this.easingFuncs!;
      const count = this.count;
      
      // 计算当前值
      for (let i = 0; i < count; i++) {
        resultValues[i] = startValues[i] + changeValues[i] * easingFuncs[i](progress);
      }
      
      // 调用更新回调
      if (this.updateCallback) {
        this.updateCallback(resultValues, this.target);
      }
    } else {
      this.checkEnd();
    }
  }
  
  /**
   * 检查动画结束
   */
  private checkEnd(): void {
    // 还有下一个命令
    if (this.index < this.commandSize && !this.yoyo) {
      const command = this.getNextCommand();
      if (command) {
        this.setCommandStates(command);
      }
      return;
    }
    
    // 开始反向播放
    if (this.reserved && !this.yoyo) {
      this.yoyo = true;
    }
    
    // 反向播放中
    if (this.yoyo && this.index > 0) {
      const command = this.getPreviousCommand();
      if (command) {
        this.setCommandStates(command);
      }
      return;
    }
    
    // 重复播放
    if (this.repeatTime > 0) {
      this.repeatTime--;
      this.index = 0;
      this.yoyo = false;
      const command = this.getNextCommand();
      if (command) {
        this.setCommandStates(command);
      }
    } else {
      // 动画完成
      this.runComplete();
      this.stop();
    }
  }
  
  /**
   * 执行完成回调
   */
  private runComplete(): void {
    if (this.completeCallback) {
      this.completeCallback();
    }
  }
  
  /**
   * 停止动画
   */
  stop(): this {
    this.isRunning = false;
    GlobalMotion.returnMotion(this);
    return this;
  }
  
  /**
   * 重置命令
   */
  private resetCommands(): void {
    for (let i = 0; i < this.commandSize; i++) {
      commandPool.return(this.commands[i]);
    }
    this.commands.length = 0;
    this.commandSize = 0;
    this.index = 0;
  }
  
  /**
   * 重置动画状态
   */
  reset(): void {
    this.startValues = null;
    this.changeValues = null;
    this.resultValues = null;
    this.easingFuncs = null;
    this.resetCommands();
    this.count = 0;
    this.totalFrames = 0;
    this.currentFrame = 0;
    this.updateCallback = null;
    this.completeCallback = null;
    this.target = null;
    this.reserved = false;
    this.yoyo = false;
    this.repeatTime = 0;
    this.currentCommand = null;
    this.isRunning = false;
  }
  
  /**
   * 链接到全局动画管理器
   */
  link(): this {
    GlobalMotion.putMotion(this);
    return this;
  }
}

// ============ MotionGroup ============

/**
 * 动画组 - 管理多个动画实例
 */
export class MotionGroup {
  /** 动画列表 */
  readonly motions: Motion[] = [];
  /** 动画数量 */
  count = 0;
  
  /**
   * 创建新动画并添加属性
   */
  setAnimation(startValue: number, endValue: number, easing: EasingType = 'linear'): Motion {
    const motion = motionPool.get();
    this.motions[this.count++] = motion;
    return motion.setAnimation(startValue, endValue, easing);
  }
  
  /**
   * 创建新命令
   */
  newCommand(): Motion {
    const motion = motionPool.get();
    this.motions[this.count++] = motion;
    return motion.newCommand();
  }
  
  /**
   * 获取新动画实例
   */
  getMotion(): Motion {
    const motion = motionPool.get();
    this.motions[this.count++] = motion;
    return motion;
  }
  
  /**
   * 添加动画到组
   */
  putMotion(motion: Motion): void {
    if (!this.motions.includes(motion)) {
      this.motions[this.count++] = motion;
    }
  }
  
  /**
   * 返回动画到池
   */
  returnMotion(motion: Motion): void {
    const index = this.motions.indexOf(motion);
    if (index !== -1) {
      this.motions.splice(index, 1);
      this.count--;
    }
    if (motion.isReturnToPool) {
      motionPool.return(motion);
    }
  }
  
  /**
   * 更新所有动画
   */
  update(): void {
    const count = this.count;
    if (count === 0) return;
    
    const motions = this.motions;
    for (let i = 0; i < count; i++) {
      const motion = motions[i];
      if (motion) {
        motion.animate();
      }
    }
  }
  
  /**
   * 清除所有动画
   */
  clear(): void {
    for (let i = 0; i < this.count; i++) {
      const motion = this.motions[i];
      if (motion) {
        motion.reset();
        if (motion.isReturnToPool) {
          motionPool.return(motion);
        }
      }
    }
    this.motions.length = 0;
    this.count = 0;
  }
}

// ============ 对象池实例 ============

const commandPool = new Pool(() => new MotionCommand(), 100);
const motionPool = new Pool(() => new Motion(), 100);

// ============ 全局动画管理器 ============

/**
 * 全局动画管理器 - 单例
 */
export const GlobalMotion = new MotionGroup();

// ============ 便捷函数 ============

/**
 * 创建简单动画
 * @example
 * const motion = createMotion()
 *   .setAnimation(0, 100, 'easeOutQuad')
 *   .setAnimation(1, 0, 'linear')
 *   .setFrames(30)
 *   .onUpdate(values => {
 *     sprite.x = values[0];
 *     sprite.alpha = values[1];
 *   })
 *   .onComplete(() => console.log('done'))
 *   .start();
 */
export function createMotion(): Motion {
  return GlobalMotion.getMotion();
}

/**
 * 创建并立即开始动画
 */
export function animate(
  startValue: number,
  endValue: number,
  frames: number,
  easing: EasingType,
  onUpdate: MotionUpdateCallback,
  onComplete?: MotionCompleteCallback
): Motion {
  const motion = createMotion()
    .setAnimation(startValue, endValue, easing)
    .setFrames(frames)
    .onUpdate(onUpdate);
  
  if (onComplete) {
    motion.onComplete(onComplete);
  }
  
  return motion.start();
}

export default GlobalMotion;
