# Design Document

## Overview

本设计实现自动更新系统的 UI 反馈功能。主要包括：
1. 在 IPCBridge 中补充 `update:progress` 事件监听
2. 创建更新对话框组件，显示下载进度、完成状态和错误信息
3. 提供格式化工具函数，将字节数转换为人类可读格式

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Process (Electron)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AutoUpdaterService                      │    │
│  │  - checkForUpdates()                                │    │
│  │  - downloadUpdate()                                 │    │
│  │  - installAndRestart()                              │    │
│  │  - Events: update:available, update:progress,       │    │
│  │            update:downloaded, update:error          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (webContents.send)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Renderer Process                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              IPCBridge                               │    │
│  │  - window.ipcOn('update:progress', ...)             │    │
│  │  - EventSystem.emit('update:progress', data)        │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              │ EventSystem                   │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           UpdateProgressDialog                       │    │
│  │  - State: idle | downloading | downloaded | error   │    │
│  │  - Progress bar with percentage                     │    │
│  │  - Download speed display                           │    │
│  │  - Action buttons                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. UpdateProgressDialog 组件

位置: `src/components/update/UpdateProgressDialog.ts`

```typescript
interface UpdateProgressState {
  visible: boolean;
  state: 'idle' | 'downloading' | 'downloaded' | 'error';
  progress: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  updateInfo: UpdateInfo | null;
  errorMessage: string | null;
}

class UpdateProgressDialog {
  private state: UpdateProgressState;
  private dialogElement: HTMLElement | null;
  
  show(updateInfo: UpdateInfo): void;
  hide(): void;
  startDownload(): void;
  updateProgress(progress: ProgressInfo): void;
  showDownloaded(): void;
  showError(message: string): void;
  private render(): void;
  private bindEvents(): void;
}
```

### 2. 格式化工具函数

位置: `src/utils/formatBytes.ts`

```typescript
/**
 * 将字节数转换为人类可读格式
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
function formatBytes(bytes: number, decimals?: number): string;

/**
 * 将字节/秒转换为人类可读的速度格式
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化后的字符串，如 "1.5 MB/s"
 */
function formatSpeed(bytesPerSecond: number): string;
```

### 3. IPCBridge 更新

位置: `src/core/IPCBridge.ts`

需要添加 `update:progress` 事件监听：

```typescript
// 在 registerIPCListeners 函数中添加
window.ipcOn('update:progress', (progress) => {
  EventSystem.emit('update:progress', progress);
});
```

## Data Models

### ProgressInfo

```typescript
interface ProgressInfo {
  percent: number;        // 0-100
  bytesPerSecond: number; // 下载速度
  transferred: number;    // 已下载字节数
  total: number;          // 总字节数
}
```

### UpdateInfo

```typescript
interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
  downloadUrl: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Byte formatting produces valid output

*For any* non-negative number of bytes, the `formatBytes` function SHALL return a string containing a number followed by a valid unit (B, KB, MB, GB, TB).

**Validates: Requirements 1.3, 1.4**

### Property 2: Speed formatting produces valid output

*For any* non-negative bytes per second value, the `formatSpeed` function SHALL return a string containing a number followed by a valid speed unit (B/s, KB/s, MB/s, GB/s).

**Validates: Requirements 1.3**

### Property 3: Progress percentage is bounded

*For any* progress update, the displayed percentage SHALL be between 0 and 100 inclusive.

**Validates: Requirements 1.2**

## Error Handling

1. **下载失败**: 显示错误对话框，包含错误信息和重试按钮
2. **网络中断**: 通过 `update:error` 事件通知，显示相应错误信息
3. **IPC 通信失败**: 使用 try-catch 包装 IPC 调用，失败时显示错误提示

## Testing Strategy

### Unit Tests

1. `formatBytes` 函数测试
   - 测试各种字节大小的格式化输出
   - 测试边界值（0, 1, 1024, 1024*1024 等）

2. `formatSpeed` 函数测试
   - 测试各种速度值的格式化输出

### Property-Based Tests

使用 fast-check 进行属性测试：

1. **formatBytes 属性测试**: 生成随机非负整数，验证输出格式正确
2. **formatSpeed 属性测试**: 生成随机非负整数，验证输出格式正确
3. **Progress 边界测试**: 生成随机进度值，验证百分比在 0-100 范围内

### Integration Tests

1. 测试 IPC 事件流：`update:progress` 事件从主进程到渲染进程的传递
2. 测试对话框状态转换：idle → downloading → downloaded
3. 测试错误状态：idle → downloading → error
