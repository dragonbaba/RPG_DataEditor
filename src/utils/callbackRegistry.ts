/**
 * 预创建回调函数注册表
 * 集中管理所有预创建的回调函数，避免运行时创建
 */

// 动画回调类型
type AnimationCallback = (values: Float32Array) => void;
type MotionCompleteCallback = () => void;

// 注册表接口
interface CallbackRegistry {
  // 侧边栏动画
  sidebarSlideIn: AnimationCallback;
  sidebarSlideOut: AnimationCallback;
  sidebarFadeIn: AnimationCallback;
  sidebarFadeOut: AnimationCallback;

  // 面板切换动画
  panelFadeIn: AnimationCallback;
  panelFadeOut: AnimationCallback;

  // 定时回调
  pulseAnimator: () => void;
  scrollSync: () => void;
}

// 导出预创建回调
export const Callbacks: CallbackRegistry = {
  // ... 初始化所有回调
  sidebarSlideIn: () => {},
  sidebarSlideOut: () => {},
  sidebarFadeIn: () => {},
  sidebarFadeOut: () => {},
  panelFadeIn: () => {},
  panelFadeOut: () => {},
  pulseAnimator: () => {},
  scrollSync: () => {},
};