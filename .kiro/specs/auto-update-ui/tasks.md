# Implementation Plan: Auto Update UI

## Overview

实现自动更新系统的 UI 反馈功能，包括下载进度显示、完成提示和错误处理。

## Tasks

- [ ] 1. 创建格式化工具函数
  - [x] 1.1 创建 `src/utils/formatBytes.ts` 文件
    - 实现 `formatBytes(bytes: number, decimals?: number): string` 函数
    - 实现 `formatSpeed(bytesPerSecond: number): string` 函数
    - _Requirements: 1.3, 1.4_
  - [x] 1.2 编写 formatBytes 属性测试
    - **Property 1: Byte formatting produces valid output**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 1.3 编写 formatSpeed 属性测试
    - **Property 2: Speed formatting produces valid output**
    - **Validates: Requirements 1.3**

- [ ] 2. 更新 IPCBridge 添加 update:progress 监听
  - [x] 2.1 在 `src/core/IPCBridge.ts` 的 `registerIPCListeners` 函数中添加 `update:progress` 事件监听
    - 监听 `window.ipcOn('update:progress', ...)` 
    - 转发到 `EventSystem.emit('update:progress', progress)`
    - _Requirements: 4.1, 4.2_

- [ ] 3. 创建 UpdateProgressDialog 组件
  - [x] 3.1 创建 `src/components/update/UpdateProgressDialog.ts` 文件
    - 定义 UpdateProgressState 接口
    - 实现 UpdateProgressDialog 类
    - 实现 show(), hide(), startDownload(), updateProgress(), showDownloaded(), showError() 方法
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_
  - [x] 3.2 实现对话框 HTML 结构和样式
    - 创建进度条 UI
    - 创建下载速度和大小显示区域
    - 创建操作按钮区域
    - 应用 sci-fi 主题样式
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 3.3 实现事件监听和状态管理
    - 监听 EventSystem 的 update:available, update:progress, update:downloaded, update:error 事件
    - 根据事件更新对话框状态
    - _Requirements: 4.3_

- [ ] 4. 实现下载和重启功能
  - [x] 4.1 实现"下载更新"按钮点击处理
    - 调用 `window.electronAPI.downloadUpdate()`
    - 切换到 downloading 状态
    - _Requirements: 1.1_
  - [x] 4.2 实现"立即重启"按钮点击处理
    - 调用 `window.electronAPI.installUpdate()`
    - _Requirements: 2.3_
  - [x] 4.3 实现"稍后重启"按钮点击处理
    - 关闭对话框
    - _Requirements: 2.4_
  - [x] 4.4 实现"重试"按钮点击处理
    - 重新调用下载
    - _Requirements: 3.2_

- [ ] 5. 集成到应用入口
  - [x] 5.1 在 `src/main.ts` 中初始化 UpdateProgressDialog
    - 导入并实例化 UpdateProgressDialog
    - 注册事件监听
    - _Requirements: 4.3_

- [x] 6. Checkpoint - 确保所有功能正常工作
  - 确保所有测试通过，如有问题请询问用户

## Notes

- All tasks are required for complete implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
