/**
 * DynamicBackground - 动态背景系统
 * 实现粒子效果、扫描线和网格背景
 * 使用全局动画循环，不使用独立的 requestAnimationFrame
 * 使用对象池管理粒子，避免全屏事件触发时创建额外对象
 * 
 * Requirements: 16.2, 16.6, 16.8
 */

import { StateManager } from './StateManager';
import { EventSystem } from './EventSystem';
import { logger } from '../services/logger';
import { GlobalRunner, BaseRunner } from '../utils/runner';

// ============ 类型定义 ============

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  active: boolean;
}

// ============ 对象池 ============

/** 粒子对象池 */
const particlePool: Particle[] = [];
const MAX_POOL_SIZE = 200;

/**
 * 从对象池获取粒子
 */
function getParticle(): Particle {
  // 查找非活跃粒子
  for (let i = 0; i < particlePool.length; i++) {
    if (!particlePool[i].active) {
      particlePool[i].active = true;
      return particlePool[i];
    }
  }
  
  // 如果池中没有可用粒子，创建新的
  if (particlePool.length < MAX_POOL_SIZE) {
    const particle: Particle = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 1,
      alpha: 0.3,
      color: currentAccentColor,
      active: true,
    };
    particlePool.push(particle);
    return particle;
  }
  
  // 池已满，复用第一个粒子
  particlePool[0].active = true;
  return particlePool[0];
}

/**
 * 归还粒子到对象池
 */
function returnParticle(particle: Particle): void {
  particle.active = false;
}

// ============ 状态 ============

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let activeParticles: Particle[] = [];
let isRunning = false;
let frameRunner: BaseRunner | null = null;

// 配置
const PARTICLE_COUNT = 50;
const PARTICLE_SPEED = 0.3;
const PARTICLE_SIZE_MIN = 1;
const PARTICLE_SIZE_MAX = 3;

// 当前强调色
let currentAccentColor = '#00f0ff';

// 扫描线元素引用（避免重复创建）
let movingScanlineElement: HTMLDivElement | null = null;
let scanlineStyleElement: HTMLStyleElement | null = null;

function handleAccentChanged(...args: unknown[]): void {
  const data = args[0] as { accentColor: string } | undefined;
  if (data?.accentColor) {
    updateAccentColor(data.accentColor);
  }
}

function handleAnimationsChanged(...args: unknown[]): void {
  const data = args[0] as { enabled: boolean } | undefined;
  if (data?.enabled) {
    start();
  } else {
    stop();
  }
}

// ============ 粒子系统 ============

/**
 * 初始化单个粒子属性
 */
function initParticleProperties(particle: Particle): void {
  particle.x = Math.random() * (canvas?.width || window.innerWidth);
  particle.y = Math.random() * (canvas?.height || window.innerHeight);
  particle.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
  particle.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
  particle.size = PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
  particle.alpha = 0.1 + Math.random() * 0.4;
  particle.color = currentAccentColor;
  particle.active = true;
}

/**
 * 初始化粒子
 */
function initParticles(): void {
  // 归还所有活跃粒子
  for (const p of activeParticles) {
    returnParticle(p);
  }
  activeParticles = [];
  
  // 获取新粒子
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = getParticle();
    initParticleProperties(particle);
    activeParticles.push(particle);
  }
}

/**
 * 更新粒子位置
 */
function updateParticles(): void {
  if (!canvas) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  for (const p of activeParticles) {
    if (!p.active) continue;
    
    p.x += p.vx;
    p.y += p.vy;
    
    // 边界检测 - 环绕
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  }
}

/**
 * 绘制粒子
 */
function drawParticles(): void {
  if (!ctx || !canvas) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (const p of activeParticles) {
    if (!p.active) continue;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
  }
  
  // 绘制连线
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = currentAccentColor;
  ctx.lineWidth = 0.5;
  
  const len = activeParticles.length;
  for (let i = 0; i < len; i++) {
    const pi = activeParticles[i];
    if (!pi.active) continue;
    
    for (let j = i + 1; j < len; j++) {
      const pj = activeParticles[j];
      if (!pj.active) continue;
      
      const dx = pi.x - pj.x;
      const dy = pi.y - pj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(pi.x, pi.y);
        ctx.lineTo(pj.x, pj.y);
        ctx.globalAlpha = 0.1 * (1 - dist / 150);
        ctx.stroke();
      }
    }
  }
  
  ctx.globalAlpha = 1;
}

// ============ 扫描线效果 ============

/**
 * 初始化扫描线
 */
function initScanline(): void {
  const scanlineOverlay = document.getElementById('scanlineOverlay');
  if (!scanlineOverlay) return;
  
  // 创建扫描线 CSS
  scanlineOverlay.style.background = `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.1) 2px,
      rgba(0, 0, 0, 0.1) 4px
    )
  `;
  
  // 只创建一次移动扫描线元素
  if (!movingScanlineElement) {
    movingScanlineElement = document.createElement('div');
    movingScanlineElement.id = 'movingScanline';
    movingScanlineElement.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, ${currentAccentColor}, transparent);
      opacity: 0.3;
      animation: scanline-move 8s linear infinite;
    `;
    scanlineOverlay.appendChild(movingScanlineElement);
  } else {
    // 更新颜色
    movingScanlineElement.style.background = `linear-gradient(90deg, transparent, ${currentAccentColor}, transparent)`;
  }
}

/**
 * 初始化网格背景
 */
function initGrid(): void {
  const gridOverlay = document.getElementById('gridOverlay');
  if (!gridOverlay) return;
  
  gridOverlay.style.background = `
    linear-gradient(${currentAccentColor}22 1px, transparent 1px),
    linear-gradient(90deg, ${currentAccentColor}22 1px, transparent 1px)
  `;
  gridOverlay.style.backgroundSize = '50px 50px';
}

// ============ 动画更新 ============

/**
 * 动画帧更新 - 由全局循环调用
 */
function updateFrame(): void {
  if (!isRunning) return;
  
  updateParticles();
  drawParticles();
}

// ============ 公共 API ============

/**
 * 初始化动态背景
 */
export function initDynamicBackground(): void {
  canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
  if (!canvas) {
    logger.warn('Particle canvas not found', undefined, 'DynamicBackground');
    return;
  }
  
  ctx = canvas.getContext('2d');
  if (!ctx) {
    logger.warn('Could not get 2D context', undefined, 'DynamicBackground');
    return;
  }
  
  // 设置画布大小
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // 初始化粒子
  initParticles();
  
  // 初始化扫描线和网格
  initScanline();
  initGrid();
  
  // 添加扫描线动画 CSS
  addScanlineAnimation();
  
  // 监听主题变化
  EventSystem.on('theme:accent-changed', handleAccentChanged);
  
  // 监听动画设置变化
  EventSystem.on('theme:animations-changed', handleAnimationsChanged);
  
  // 检查动画是否启用
  const state = StateManager.getState();
  if (state.config.animationsEnabled !== false) {
    start();
  }
  
  // 标记容器已加载
  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('loaded');
  }
  
  logger.info('DynamicBackground initialized', undefined, 'DynamicBackground');
}

/**
 * 调整画布大小
 */
function resizeCanvas(): void {
  if (!canvas) return;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/**
 * 添加扫描线动画 CSS
 */
function addScanlineAnimation(): void {
  // 只创建一次样式元素
  if (!scanlineStyleElement) {
    scanlineStyleElement = document.createElement('style');
    scanlineStyleElement.textContent = `
      @keyframes scanline-move {
        0% { top: -2px; }
        100% { top: 100%; }
      }
    `;
    document.head.appendChild(scanlineStyleElement);
  }
}

/**
 * 更新强调色
 */
export function updateAccentColor(accent: string): void {
  const colors: Record<string, string> = {
    cyan: '#00f0ff',
    magenta: '#ff00ff',
    green: '#00ff88',
    orange: '#ff8800',
  };
  
  currentAccentColor = colors[accent] || colors.cyan;
  
  // 更新粒子颜色（不创建新对象）
  for (const p of activeParticles) {
    p.color = currentAccentColor;
  }
  
  // 更新扫描线颜色（复用现有元素）
  if (movingScanlineElement) {
    movingScanlineElement.style.background = `linear-gradient(90deg, transparent, ${currentAccentColor}, transparent)`;
  }
  
  // 更新网格颜色
  initGrid();
  
  logger.debug('Accent color updated', { accent }, 'DynamicBackground');
}

/**
 * 启动动画
 */
export function start(): void {
  if (isRunning) return;
  
  isRunning = true;
  
  // 使用全局 Runner 系统注册每帧更新
  if (!frameRunner) {
    frameRunner = GlobalRunner.on(updateFrame, null, 0, -1);
    frameRunner.autoReturn(false);
  } else {
    GlobalRunner.put(frameRunner);
  }
  
  // 显示背景元素
  const bg = document.getElementById('dynamicBackground');
  if (bg) {
    bg.style.display = 'block';
  }
  
  logger.debug('DynamicBackground started', undefined, 'DynamicBackground');
}

/**
 * 停止动画
 */
export function stop(): void {
  isRunning = false;
  if (frameRunner) {
    GlobalRunner.off(frameRunner);
  }
  
  // 从全局 Runner 系统移除
  // 注意：Runner 系统会在下一帧自动清理已完成的 runner
  
  // 隐藏背景元素
  const bg = document.getElementById('dynamicBackground');
  if (bg) {
    bg.style.display = 'none';
  }
  
  logger.debug('DynamicBackground stopped', undefined, 'DynamicBackground');
}

/**
 * 切换动画状态
 */
export function toggle(): void {
  if (isRunning) {
    stop();
  } else {
    start();
  }
}

/**
 * 检查是否正在运行
 */
export function isAnimating(): boolean {
  return isRunning;
}

export default {
  init: initDynamicBackground,
  start,
  stop,
  toggle,
  isAnimating,
  updateAccentColor,
};
