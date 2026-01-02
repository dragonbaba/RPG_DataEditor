/**
 * PixiRenderer - PIXI 渲染器管理
 * 实现单一渲染器实例、场景管理、尺寸调整
 * 注册到 GlobalLoop 进行渲染
 * 
 * 注意：
 * - 只有一个渲染器实例
 * - 弹道预览作为一个场景
 * - 切换场景时不销毁渲染器
 * - 不使用 PIXI.Application
 * - 不使用 Graphics 进行批量渲染，只使用 Sprite 和 Canvas 绘制
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import * as PIXI from 'pixi.js';
import { GlobalRunner } from '../utils/runner';
import { logger } from '../services/logger';

// ============ 类型定义 ============

/** 场景配置 */
interface SceneConfig {
  name: string;
  container: PIXI.Container;
  canvas?: HTMLCanvasElement;
}

// ============ PixiRenderer 类 ============

/**
 * PIXI 渲染器管理器 - 单例模式
 */
class PixiRendererClass {
  /** 渲染器实例 */
  renderer: PIXI.Renderer | null = null;
  
  /** 画布元素 */
  canvas: HTMLCanvasElement | null = null;
  
  /** 当前场景 */
  currentScene: PIXI.Container | null = null;
  
  /** 当前场景名称 */
  currentSceneName: string = '';
  
  /** 场景映射 */
  private scenes: Map<string, SceneConfig> = new Map();
  
  /** 是否已初始化 */
  private initialized = false;
  
  /** 渲染器宽度 */
  private width = 0;
  
  /** 渲染器高度 */
  private height = 0;
  
  /** 是否已注册到 GlobalLoop */
  private registeredToLoop = false;

  /**
   * 初始化渲染器
   */
  async initialize(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.initialized) {
      logger.warn('PixiRenderer already initialized', undefined, 'PixiRenderer');
      return;
    }
    
    this.width = width;
    this.height = height;
    
    try {
      // 创建画布
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      container.appendChild(this.canvas);
      
      // 创建渲染器
      this.renderer = new PIXI.Renderer({
        view: this.canvas,
        width,
        height,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      
      // 创建默认场景
      this.createScene('default');
      this.setScene('default');
      
      // 注册到 GlobalLoop
      this.registerToLoop();
      
      this.initialized = true;
      logger.info('PixiRenderer initialized', { width, height }, 'PixiRenderer');
    } catch (error) {
      logger.error('Failed to initialize PixiRenderer', { error }, 'PixiRenderer');
      throw error;
    }
  }

  /** 渲染 Runner */
  private renderRunner: ReturnType<typeof GlobalRunner.on> | null = null;

  /**
   * 注册到 GlobalLoop（通过 Runner 系统）
   */
  private registerToLoop(): void {
    if (this.registeredToLoop) return;
    
    // 使用 Runner 系统每帧渲染
    this.renderRunner = GlobalRunner.on(this.render.bind(this), this, 0, -1);
    this.registeredToLoop = true;
    
    logger.debug('PixiRenderer registered to GlobalLoop', undefined, 'PixiRenderer');
  }

  /**
   * 从 GlobalLoop 注销
   */
  private unregisterFromLoop(): void {
    if (!this.registeredToLoop) return;
    
    if (this.renderRunner) {
      GlobalRunner.off(this.renderRunner);
      this.renderRunner = null;
    }
    this.registeredToLoop = false;
    
    logger.debug('PixiRenderer unregistered from GlobalLoop', undefined, 'PixiRenderer');
  }

  /**
   * 创建场景
   */
  createScene(name: string): PIXI.Container {
    if (this.scenes.has(name)) {
      logger.warn('Scene already exists', { name }, 'PixiRenderer');
      return this.scenes.get(name)!.container;
    }
    
    const container = new PIXI.Container();
    container.name = name;
    
    const config: SceneConfig = {
      name,
      container,
    };
    
    this.scenes.set(name, config);
    logger.debug('Scene created', { name }, 'PixiRenderer');
    
    return container;
  }

  /**
   * 获取场景
   */
  getScene(name: string): PIXI.Container | null {
    const config = this.scenes.get(name);
    return config?.container ?? null;
  }

  /**
   * 设置当前场景
   */
  setScene(name: string): boolean {
    const config = this.scenes.get(name);
    if (!config) {
      logger.warn('Scene not found', { name }, 'PixiRenderer');
      return false;
    }
    
    this.currentScene = config.container;
    this.currentSceneName = name;
    
    logger.debug('Scene set', { name }, 'PixiRenderer');
    return true;
  }

  /**
   * 删除场景
   */
  destroyScene(name: string): boolean {
    if (name === 'default') {
      logger.warn('Cannot destroy default scene', undefined, 'PixiRenderer');
      return false;
    }
    
    const config = this.scenes.get(name);
    if (!config) {
      return false;
    }
    
    // 如果是当前场景，切换到默认场景
    if (this.currentSceneName === name) {
      this.setScene('default');
    }
    
    // 销毁容器
    config.container.destroy({ children: true });
    this.scenes.delete(name);
    
    logger.debug('Scene destroyed', { name }, 'PixiRenderer');
    return true;
  }

  /**
   * 调整渲染器尺寸
   */
  resize(width: number, height: number): void {
    if (!this.renderer || !this.canvas) return;
    
    this.width = width;
    this.height = height;
    
    this.renderer.resize(width, height);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    logger.debug('PixiRenderer resized', { width, height }, 'PixiRenderer');
  }

  /**
   * 渲染当前场景（由 GlobalLoop 调用）
   */
  render(): void {
    if (!this.renderer || !this.currentScene) return;
    
    try {
      this.renderer.render(this.currentScene);
    } catch (error) {
      // 渲染错误不应中断动画循环
      logger.error('Render error', { error }, 'PixiRenderer');
    }
  }

  /**
   * 获取渲染器尺寸
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 清空当前场景
   */
  clearCurrentScene(): void {
    if (!this.currentScene) return;
    
    this.currentScene.removeChildren();
    logger.debug('Current scene cleared', { name: this.currentSceneName }, 'PixiRenderer');
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    if (!this.initialized) return;
    
    // 从 GlobalLoop 注销
    this.unregisterFromLoop();
    
    // 销毁所有场景
    for (const [name, config] of this.scenes) {
      config.container.destroy({ children: true });
      logger.debug('Scene destroyed during cleanup', { name }, 'PixiRenderer');
    }
    this.scenes.clear();
    
    // 销毁渲染器
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    
    // 移除画布
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }
    
    this.currentScene = null;
    this.currentSceneName = '';
    this.initialized = false;
    
    logger.info('PixiRenderer destroyed', undefined, 'PixiRenderer');
  }
}

// ============ Canvas 绘制工具 ============

/**
 * 创建用于绘制的 Canvas 纹理
 */
export function createCanvasTexture(
  width: number,
  height: number,
  drawCallback: (ctx: CanvasRenderingContext2D) => void
): PIXI.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawCallback(ctx);
  }
  
  return PIXI.Texture.from(canvas);
}

/**
 * 绘制轨迹线到 Canvas
 */
export function drawTrajectoryLine(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string = '#4da6ff',
  lineWidth: number = 2
): void {
  if (points.length < 2) return;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  ctx.stroke();
}

/**
 * 绘制圆点到 Canvas
 */
export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string = '#4da6ff'
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// ============ 导出单例 ============

/** 全局 PIXI 渲染器实例 */
export const PixiRenderer = new PixiRendererClass();

export default PixiRenderer;
